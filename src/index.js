import visit from 'unist-util-visit'
import extend from 'extend'

const behaviors = {prepend: 'unshift', append: 'push'}

const contentDefaults = {
  type: 'element',
  tagName: 'span',
  properties: {className: ['icon', 'icon-link']}
}

const defaults = {behavior: 'prepend', content: contentDefaults}

const splice = [].splice

let deprecationWarningIssued = false

export default function attacher(options = {}) {
  let {linkProperties, behavior, content} = {...defaults, ...options}
  let method

  // NOTE: Remove in next major version
  if (options.behaviour !== undefined) {
    if (!deprecationWarningIssued) {
      deprecationWarningIssued = true
      console.warn(
        '[remark-autolink-headings] Deprecation Warning: `behaviour` is a nonstandard option. Use `behavior` instead.'
      )
    }

    behavior = options.behaviour
  }

  if (behavior === 'wrap') {
    method = wrap
  } else if (behavior === 'before' || behavior === 'after') {
    method = around
  } else {
    method = inject

    if (!linkProperties) {
      linkProperties = {ariaHidden: 'true', tabIndex: -1}
    }
  }

  return (tree) => visit(tree, 'heading', visitor)

  function visitor(node, index, parent) {
    const {data} = node
    const id = data && data.hProperties && data.hProperties.id

    if (id) {
      return method(node, '#' + id, index, parent)
    }
  }

  function inject(node, url) {
    const link = create(url)

    link.data = {
      hProperties: toProps(linkProperties),
      hChildren: toChildren(content, node)
    }

    node.children[behaviors[behavior]](link)
  }

  function around(node, url, index, parent) {
    const link = create(url)

    link.data = {
      hProperties: toProps(linkProperties),
      hChildren: toChildren(content, node)
    }

    const nodes = behavior === 'before' ? [link, node] : [node, link]

    splice.apply(parent.children, [index, 1].concat(nodes))

    return [visit.SKIP, index + nodes.length]
  }

  function wrap(node, url) {
    const link = create(url, node.children)

    link.data = {hProperties: toProps(linkProperties)}

    node.children = [link]
  }

  function toProps(value) {
    return deepAssign({}, value)
  }

  function toChildren(value, node) {
    let children = typeof value === 'function' ? value(node) : value

    children = Array.isArray(children) ? children : [children]

    return typeof value === 'function' ? children : deepAssign([], children)
  }

  function create(url, children) {
    return {
      type: 'link',
      url,
      title: null,
      children: children || []
    }
  }

  function deepAssign(base, value) {
    return extend(true, base, value)
  }
}
