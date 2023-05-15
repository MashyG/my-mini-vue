interface NodeTransforms {
  nodeTransforms: any[];
}
interface TransformContext {
  root: any;
  nodeTransforms: NodeTransforms[];
}

export function transform(root: any, options: NodeTransforms) {
  const context = createTransformContext(root, options);
  // 1. 深度优先遍历
  traverseNode(root, context);
}

function createTransformContext(
  root: any,
  options: NodeTransforms
): TransformContext {
  return {
    root,
    nodeTransforms: options.nodeTransforms || [],
  };
}

function traverseNode(node: any, context: TransformContext) {
  const { nodeTransforms } = context || {};
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transformFunc: any = nodeTransforms[i];
    transformFunc(node);
  }

  console.log("node", node);

  traverseChildren(node.children, context);
}

function traverseChildren(children: any, context: TransformContext) {
  if (children) {
    for (let j = 0; j < children.length; j++) {
      const childNode = children[j];
      traverseNode(childNode, context);
    }
  }
}
