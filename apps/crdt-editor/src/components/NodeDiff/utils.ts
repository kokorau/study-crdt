import type { NodeItem, NodeContent, NodeData, RenderNode } from './types'

/**
 * NodeItem[]とNodeContent[]から階層構造のRenderNode[]を構築
 */
export function buildRenderTree(nodeData: NodeData): RenderNode[] {
  const { nodeList, nodeContentList } = nodeData
  
  // UUIDをキーとしたマップを作成
  const nodeMap = new Map<string, NodeItem>()
  const contentMap = new Map<string, NodeContent>()
  
  nodeList.forEach(node => nodeMap.set(node.uuid, node))
  nodeContentList.forEach(content => contentMap.set(content.uuid, content))
  
  const renderNodeMap = new Map<string, RenderNode>()
  
  // 全てのRenderNodeを作成
  nodeList.forEach(node => {
    const content = contentMap.get(node.uuid)
    if (content) {
      const renderNode: RenderNode = {
        uuid: node.uuid,
        tagName: content.tagName,
        textContent: content.textContent,
        attrs: content.attrs,
        style: content.style,
        children: []
      }
      renderNodeMap.set(node.uuid, renderNode)
    }
  })
  
  // 親子関係を構築
  nodeList.forEach(node => {
    const renderNode = renderNodeMap.get(node.uuid)
    if (renderNode) {
      node.children.forEach(childUuid => {
        const childRenderNode = renderNodeMap.get(childUuid)
        if (childRenderNode) {
          renderNode.children.push(childRenderNode)
          childRenderNode.parent = renderNode
        }
      })
    }
  })
  
  // ルートノードを見つける（parentが未設定のノード）
  const rootNodes: RenderNode[] = []
  renderNodeMap.forEach(node => {
    if (!node.parent) {
      rootNodes.push(node)
    }
  })
  
  return rootNodes
}

/**
 * RenderNodeを簡易HTMLライクな文字列に変換（デバッグ用）
 */
export function renderNodeToString(node: RenderNode, indent = 0): string {
  const indentStr = '  '.repeat(indent)
  
  if (node.textContent) {
    return `${indentStr}"${node.textContent}"`
  }
  
  const tagName = node.tagName || 'unknown'
  const attrs = []
  
  if (node.attrs.id) attrs.push(`id="${node.attrs.id}"`)
  if (node.attrs.class.length > 0) attrs.push(`class="${node.attrs.class.join(' ')}"`)
  if (Object.keys(node.style).length > 0) {
    const styleStr = Object.entries(node.style)
      .map(([key, value]) => `${key}: ${value}`)
      .join('; ')
    attrs.push(`style="${styleStr}"`)
  }
  
  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : ''
  
  if (node.children.length === 0) {
    return `${indentStr}<${tagName}${attrStr} />`
  }
  
  const childrenStr = node.children
    .map(child => renderNodeToString(child, indent + 1))
    .join('\n')
  
  return `${indentStr}<${tagName}${attrStr}>\n${childrenStr}\n${indentStr}</${tagName}>`
}