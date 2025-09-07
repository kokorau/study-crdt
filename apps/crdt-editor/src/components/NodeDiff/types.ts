export type NodeItem = {
  uuid: string
  children: string[]
}

export type NodeContent = {
  uuid: string
  tagName?: string
  textContent?: string
  attrs: {
    data: Record<string, string>
    class: string[]
    id?: string
  }
  style: Record<string, string>
}

export type NodeData = {
  nodeList: NodeItem[]
  nodeContentList: NodeContent[]
}

export type NodeDiffData = {
  before: NodeData
  after: NodeData
}

// レンダリング用の統合されたノード型
export type RenderNode = {
  uuid: string
  tagName?: string
  textContent?: string
  attrs: {
    data: Record<string, string>
    class: string[]
    id?: string
  }
  style: Record<string, string>
  children: RenderNode[]
  parent?: RenderNode
}