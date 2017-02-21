'use babel'

const jQuery = require('jquery')

module.exports = class SelectProjectView {
  constructor(files, headline) {
    headline = (headline === undefined) ? 'Please choose a file' : headline
    const rootView = jQuery('<div tabindex="0" id="select-file" class="select-list fuzzy-finder">' +
                       `<div>${headline}</div>`+
                       '<ol class="list-group">'+
                       '</ol>'+
                       '</div>')

    jQuery(rootView).find('ol.list-group').html(this.listItems(files))

    atom.workspace.addModalPanel({item:rootView, visible:true})
    rootView.focus()
  }

  listItems(files) {
    return files.map((x) => '<li><div class="primary-line file">'+x+'</div></li>')
  }
}
