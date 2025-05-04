/**

Paste this into browser console at post editing page on hoyolab.com

WARNING!!

Do NOT ever paste into browser console ANYTHING that you do not understand.

*/

async function webpack_import(moduleName) {
  if (!window.webpackInternals) {
    window.webpackInternals = await (new Promise(r => webpackJsonp.push([[], { _: (a, b, c) => r([a, b, c]) }, ['_']])));
  }
  var module = Object.values(webpackInternals[2].c).find(module => {
    if (module && module.exports && module.exports[moduleName]) return true;
  });
  return module ? module.exports[moduleName] : null;
};

setTimeout(async function () {
  var Quill = await webpack_import('Quill');
  window.Quill = Quill;
  var quill = Quill.find(document.getElementsByClassName('ql-container')[0], true);
  window.quill = quill;
  var delta = quill.getContents();
  console.log(delta);
  var mark = delta2bb(delta.ops);
  var result = await show_popup(mark).catch(x => null);
  if (result) {
    delta = bb2delta(result);
    console.log(delta);
    quill.setContents(delta);
  } else {
    console.log(mark, bb2delta(mark));
  }
}, 100);

function delta2bb(ops) {
  var line = '\n';
  var active = Object.create(null);
  for (var op of ops) {
    var text = op.insert;
    if (!text) {
      continue;
    }
    if ((typeof text) === 'object') {
      line += '[' + JSON.stringify(text) + ']';
      continue;
    }
    text = text.replace(/\[/g, '[[').replace(/\]/g, ']]');
    var attr = op.attributes;
    if (!attr) {
      for (var at of Object.keys(active).reverse()) {
        line += '[/' + at + ']';
      }
      active = Object.create(null);
      line += text;
      continue;
    }
    if (text.indexOf('\n') >= 0) {
      var open = [];
      var close = [];
      for (var at in attr) {
        var val = attr[at];
        open.push('[' + at + (val === true ? '' : '=' + val) + ']');
        close.push('[/' + at + ']');
      }
      var pos = line.lastIndexOf('\n');
      line = line.substring(0, pos + 1) + open.join('') + line.substring(pos + 1) + close.reverse().join('') + text;
      continue;
    }
    for (var at of Object.keys(active).reverse()) {
      if (attr[at] !== active[at]) {
        line += '[/' + at + ']';
        delete active[at];
      }
    }
    for (var at in attr) {
      var val = attr[at];
      if (active[at] !== val) {
        active[at] = val;
        line += '[' + at + (val === true ? '' : '=' + val) + ']';
      }
    }
    line += text;
  }
  return line.substring(1);
};

function bb2delta(text) {
  text = text.trim().replace(/[\x01-\x04]/g, '').replace(/\[\[/g, '\x01').replace(/]]/g, '\x02');
  var arr = [];
  text = text.replace(/\[(?:(\/?)(\w+)(?:=([^\]]+))?|({".*?}))]/g, function (m, c, k, v, j) {
    arr.push([c, k, v, j]);
    return j ? '\x04' : '\x03';
  }).replace(/(\x03+)(\n+)/g, '$2$1').replace(/\x04/g, '\x03');
  var idx = 0;
  var ops = [];
  var active = Object.create(null);
  for (var line of text.split('\x03')) {
    if (line) {
      line = line.replace(/\x01/g, '[').replace(/\x02/g, ']');
      var empty = true;
      for (var x in active) {
        empty = false;
        break;
      }
      if (empty) {
        ops.push({
          insert: line,
        });
      } else {
        ops.push({
          insert: line,
          attributes: Object.assign({}, active),
        });
      }
    }
    var tri = arr[idx++];
    if (tri) {
      if (tri[3]) {
        ops.push({
          insert: JSON.parse(tri[3]),
        });
      } else if (tri[0]) {
        delete active[tri[1]];
      } else {
        active[tri[1]] = tri[2] || true;
      }
    } else {
      active = Object.create(null);
    }
  }
  return ops;
};

function show_popup(my_text) {
  return new Promise((resolve, reject) => {
    var old = document.getElementById('hoyolab-bbcode-editor');
    if (old) {
      document.body.removeChild(old);
    }
    var popup = document.createElement('div');
    popup.id = 'hoyolab-bbcode-editor';
    popup.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,0.7);display:flex;justify-content:center;align-items:center;z-index:1000;';
    var container = document.createElement('div');
    container.style.cssText = 'background:white;padding:20px;border-radius:10px;display:flex;flex-direction:column;width:90%;max-width:600px;height:80%;';
    var textarea = document.createElement('textarea');
    textarea.style.cssText = 'flex-grow:1;padding:10px;border:1px solid #ccc;border-radius:5px;';
    var buttons = document.createElement('div');
    buttons.style.cssText = 'margin-top:10px;display:flex;justify-content:space-between;';
    var save = document.createElement('button');
    save.innerText = 'Save';
    save.style.cssText = 'padding:10px 20px;border:none;background-color:#4CAF50;color:white;border-radius:5px;cursor:pointer;';
    save.onclick = () => {
      document.body.removeChild(popup);
      document.body.style.overflow = '';
      resolve(textarea.value);
    };
    var cancel = document.createElement('button');
    cancel.innerText = 'Cancel';
    cancel.style.cssText = 'padding:10px 20px;border:none;background-color:#f44336;color:white;border-radius:5px;cursor:pointer;';
    cancel.onclick = () => {
      document.body.removeChild(popup);
      document.body.style.overflow = '';
      reject();
    };
    buttons.appendChild(save);
    buttons.appendChild(cancel);
    container.appendChild(textarea);
    container.appendChild(buttons);
    popup.appendChild(container);
    document.body.appendChild(popup);
    document.body.style.overflow = 'hidden';
    textarea.value = my_text;
  });
};

//EOF
