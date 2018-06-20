/* eslint-disable react/no-array-index-key */
import React from 'react';
import { getVisibleSelectionRect } from 'draft-js';

const inCodeBlock = (editorState) => {
  const startKey = editorState.getSelection().getStartKey();
  const endKey = editorState.getSelection().getEndKey();
  if (startKey && endKey) {
    const contentState = editorState.getCurrentContent();
    const blocks = contentState.getBlocksAsArray();

    const selectedBlocks = blocks.slice(
      Math.max(blocks.indexOf(contentState.getBlockForKey(startKey)) - 1, 0),
      Math.min(blocks.indexOf(contentState.getBlockForKey(endKey)) + 1, blocks.length)
    );

    return selectedBlocks.find((block) => block.getType() === 'code-block');
  }

  return false;
};

export default class Toolbar extends React.Component {

  state = {
    isVisible: false,
    position: undefined,

    /**
     * If this is set, the toolbar will render this instead of the regular
     * structure and will also be shown when the editor loses focus.
     * @type {Component}
     */
    overrideContent: undefined
  }

  componentWillMount() {
    this.props.store.subscribeToItem('selection', this.onSelectionChanged);
  }

  componentWillUnmount() {
    this.props.store.unsubscribeFromItem('selection', this.onSelectionChanged);
  }

  /**
   * This can be called by a child in order to render custom content instead
   * of the regular structure. It's the responsibility of the callee to call
   * this function again with `undefined` in order to reset `overrideContent`.
   * @param {Component} overrideContent
   */
  onOverrideContent = (overrideContent) => {
    this.setState({ overrideContent });
  }

  onSelectionChanged = () => {
    // need to wait a tick for window.getSelection() to be accurate
    // when focusing editor with already present selection
    setTimeout(() => {
      if (!this.toolbar) return;

      // The editor root should be two levels above the node from
      // `getEditorRef`. In case this changes in the future, we
      // attempt to find the node dynamically by traversing upwards.
      const editorRef = this.props.store.getItem('getEditorRef')();
      if (!editorRef) return;

      // This keeps backwards compatibility with React 15
      let editorRoot = editorRef.refs && editorRef.refs.editor
        ? editorRef.refs.editor : editorRef.editor;
      while (editorRoot.className.indexOf('DraftEditor-root') === -1) {
        editorRoot = editorRoot.parentNode;
      }
      const editorRootRect = editorRoot.getBoundingClientRect();

      const selectionRect = getVisibleSelectionRect(window);
      if (!selectionRect) return;

      // The toolbar shouldn't be positioned directly on top of the selected text,
      // but rather with a small offset so the caret doesn't overlap with the text.
      const extraTopOffset = -5;

      const position = {
        top: (editorRoot.offsetTop - this.toolbar.offsetHeight)
          + (selectionRect.top - editorRootRect.top)
          + extraTopOffset,
        left: editorRoot.offsetLeft
          + (selectionRect.left - editorRootRect.left)
          + (selectionRect.width / 2)
      };
      this.setState({ position });
    });
  };

  getStyle() {
    const { store } = this.props;
    const { overrideContent, position } = this.state;
    const selection = store.getItem('getEditorState')().getSelection();
    const editorState = store.getItem('getEditorState')();
    // overrideContent could for example contain a text input, hence we always show overrideContent
    // TODO: Test readonly mode and possibly set isVisible to false if the editor is readonly
    const isVisible = (!selection.isCollapsed() && selection.getHasFocus() && !inCodeBlock(editorState)) || overrideContent;
    const style = { ...position };

    if (isVisible) {
      style.visibility = 'visible';
      style.transform = 'translate(-50%) scale(1)';
      style.transition = 'transform 0.15s cubic-bezier(.3,1.2,.2,1)';
    } else {
      style.transform = 'translate(-50%) scale(0)';
      style.visibility = 'hidden';
    }

    return style;
  }

  handleToolbarRef = (node) => {
    this.toolbar = node;
  };

  render() {
    const { theme, store, structure } = this.props;
    const { overrideContent: OverrideContent } = this.state;
    const childrenProps = {
      theme: theme.buttonStyles,
      getEditorState: store.getItem('getEditorState'),
      setEditorState: store.getItem('setEditorState'),
      onOverrideContent: this.onOverrideContent
    };

    return (
      <div
        className={theme.toolbarStyles.toolbar}
        style={this.getStyle()}
        ref={this.handleToolbarRef}
      >
        {OverrideContent
          ? <OverrideContent {...childrenProps} />
          : structure.map((Component, index) =>
            <Component key={index} {...childrenProps} />)}
      </div>
    );
  }
}
