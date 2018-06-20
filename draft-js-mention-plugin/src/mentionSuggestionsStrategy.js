/* @flow */

import escapeRegExp from 'lodash.escaperegexp';

const findWithRegex = (regex, contentBlock, callback) => {
  const contentBlockText = contentBlock.getText();
  // exclude entities, when matching
  contentBlock.findEntityRanges(
    (character) => !character.getEntity(),
    (nonEntityStart, nonEntityEnd) => {
      const text = contentBlockText.slice(nonEntityStart, nonEntityEnd);
      let matchArr;
      let start;
      // Go through all matches in the text and return the indices to the callback
      while ((matchArr = regex.exec(text)) !== null) { // eslint-disable-line
        start = nonEntityStart + matchArr.index;
        callback(start, start + matchArr[0].length);
      }
    }
  );
};

export default (trigger: string, regExp: string) => (contentBlock: Object, callback: Function) => {
  const reg = new RegExp(`${escapeRegExp(trigger)}[\\w\\s]{0,}`, 'g');
  findWithRegex(reg, contentBlock, callback);
};
