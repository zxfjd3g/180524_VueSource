function Compile(el, vm) {
  // 保存vm
  this.$vm = vm;
  // 保存el元素
  this.$el = this.isElementNode(el) ? el : document.querySelector(el);

  // 如果el存在
  if (this.$el) {
    // 1. 取出el中所有子节点保存到内存的fragment容器中
    this.$fragment = this.node2Fragment(this.$el);
    // 2. 编译fragment中所有层次的子节点
    this.init();
    // 3. 将编译好的fragment添加到el中
    this.$el.appendChild(this.$fragment);
  }
}

Compile.prototype = {
  node2Fragment: function (el) {
    var fragment = document.createDocumentFragment(),
      child;

    // 将原生节点拷贝到fragment
    while (child = el.firstChild) {
      fragment.appendChild(child);
    }

    return fragment;
  },

  init: function () {
    // 编译fragment中所有子节点
    this.compileElement(this.$fragment);
  },

  compileElement: function (el) {
    // 得到所有子节点
    var childNodes = el.childNodes,
      me = this;

    // 遍历所有子节点
    [].slice.call(childNodes).forEach(function (node) {
      // 得到节点的文本内容
      var text = node.textContent;
      // 定义匹配大括号表达式的正则对象
      var reg = /\{\{(.*)\}\}/;  // {{name}}

      // 如果当前节点是元素
      if (me.isElementNode(node)) {
        // 编译元素节点的指令
        me.compile(node);
        // 如果节点是一个大括号表达式格式的文本节点
      } else if (me.isTextNode(node) && reg.test(text)) {
        // 编译大括号表达式格式的文本节点
        me.compileText(node, RegExp.$1); // $1就是表达式: name
      }

      // 如果当前子节点还有子节点
      if (node.childNodes && node.childNodes.length) {
        // 那就递归调用, 实现所有层次子节点的编译
        me.compileElement(node);
      }
    });
  },

  // 编译元素节点中的所有指令属性
  compile: function (node) {
    // 得到所有属性节点
    var nodeAttrs = node.attributes,
      me = this;

    // 遍历所有属性
    [].slice.call(nodeAttrs).forEach(function (attr) {
      // 得到属性名: v-on:click
      var attrName = attr.name;
      // 如果是一个指令属性
      if (me.isDirective(attrName)) {
        // 得到属性值, 也就是表达式: test
        var exp = attr.value;
        // 得到指令名: on:click
        var dir = attrName.substring(2);
        // 如果是事件指令
        if (me.isEventDirective(dir)) {
          // 解析事件指令
          compileUtil.eventHandler(node, me.$vm, exp, dir);
        // 如果是普通指令
        } else {
          // 调用对应工具函数去解析
          compileUtil[dir] && compileUtil[dir](node, me.$vm, exp);
        }

        // 移除指令属性
        node.removeAttribute(attrName);
      }
    });
  },

  // 编译文本节点
  compileText: function (node, exp) {
    compileUtil.text(node, this.$vm, exp);
  },

  isDirective: function (attr) {
    return attr.indexOf('v-') == 0;
  },

  isEventDirective: function (dir) {
    return dir.indexOf('on') === 0;
  },

  isElementNode: function (node) {
    return node.nodeType == 1;
  },

  isTextNode: function (node) {
    return node.nodeType == 3;
  }
};

// 指令处理集合
var compileUtil = {
  // 编译v-text和{{}}
  text: function (node, vm, exp) {
    this.bind(node, vm, exp, 'text');
  },

  // 编译v-html
  html: function (node, vm, exp) {
    this.bind(node, vm, exp, 'html');
  },

  // 编译v-model
  model: function (node, vm, exp) {
    this.bind(node, vm, exp, 'model');

    var me = this,
      val = this._getVMVal(vm, exp);
    // 绑定input事件监听
    node.addEventListener('input', function (e) { // 一旦输入框中的数据发生改变就回调
      // 得到最新的值
      var newValue = e.target.value;
      if (val === newValue) {
        return;
      }
      // 将最新的值保存给表达式所对应的属性值, 就会导致对应的set调用, 从而更新相关的所有界面
      me._setVMVal(vm, exp, newValue);
      val = newValue;
    });
  },

  // 编译v-class
  class: function (node, vm, exp) {
    this.bind(node, vm, exp, 'class');
  },

  /*
  exp: 表达式   name
  dir: 指令名   text/html/model/class
   */
  bind: function (node, vm, exp, dir) {
    // 根据指令名得到对应的节点更新函数
    var updaterFn = updater[dir + 'Updater'];

    // 如果函数存在, 调用函数更新节点--> 实现初始化显示
    updaterFn && updaterFn(node, this._getVMVal(vm, exp));

    // 为当前表达式创建对应的watcher对象, 并指定用于更新当前节点的回调函数
    new Watcher(vm, exp, function (value, oldValue) {
      // 更新节点
      updaterFn && updaterFn(node, value, oldValue);
    });
  },

  // 事件处理
  eventHandler: function (node, vm, exp, dir) {
    // 得到事件名(类型): click
    var eventType = dir.split(':')[1],
      // 得到methods中表达式对应的事件回调函数: test
      fn = vm.$options.methods && vm.$options.methods[exp];
    // 如果都存在
    if (eventType && fn) {
      // 给节点绑定指定事件名和回调函数的dom事件监听, 强制绑定了回调函数this为vm
      node.addEventListener(eventType, fn.bind(vm), false);
    }
  },

  // 得到指定表达式对应的data中的某个属性值
  _getVMVal: function (vm, exp) {
    var val = vm._data;
    exp = exp.split('.');
    exp.forEach(function (k) {
      val = val[k];
    });
    return val;
  },

  _setVMVal: function (vm, exp, value) {
    var val = vm._data;
    exp = exp.split('.');
    exp.forEach(function (k, i) {
      // 非最后一个key，更新val的值
      if (i < exp.length - 1) {
        val = val[k];
      } else {
        val[k] = value;
      }
    });
  }
};


/*
包含n个用于更新节点的工具对象
 */
var updater = {
  // 更新节点的textContent属性值
  textUpdater: function (node, value) {
    node.textContent = typeof value == 'undefined' ? '' : value;
  },

  // 更新节点的innerHTML属性值
  htmlUpdater: function (node, value) {
    node.innerHTML = typeof value == 'undefined' ? '' : value;
  },

  // 更新节点的className属性值
  classUpdater: function (node, value, oldValue) {
    var className = node.className;
    node.className = className + (className ? ' ' : '') + value;
  },

  // 更新节点的value属性值
  modelUpdater: function (node, value, oldValue) {
    node.value = typeof value == 'undefined' ? '' : value;
  }
};