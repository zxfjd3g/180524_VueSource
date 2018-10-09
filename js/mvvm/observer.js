function Observer(data) {
  // 保存data
  this.data = data;
  // 开启对data中数据的劫持
  this.walk(data);
}

Observer.prototype = {
  walk: function (data) {
    var me = this;
    // 遍历data中所有属性
    Object.keys(data).forEach(function (key) {
      // 实现对指定属性的数据劫持
      me.defineReactive(data, key, data[key]);
    });
  },

  defineReactive: function (data, key, val) {
    // 创建对应的dep对象
    var dep = new Dep();
    // 通过隐式递归调用, 实现对所有层次属性的劫持
    var childObj = observe(val);
    // 给data中指定属性进行重新定义
    Object.defineProperty(data, key, {
      enumerable: true, // 可枚举
      configurable: false, // 不能再define
      // 返回属性值, 同建立dep与watcher之间的关系
      get: function () {
        if (Dep.target) {
          dep.depend();
        }
        return val;
      },
      // 监视属性值的变化, 一旦变化去更新对应的界面
      set: function (newVal) {
        if (newVal === val) {
          return;
        }
        val = newVal;
        // 是object的新的值话，进行监听
        childObj = observe(newVal);
        // 通知订阅者
        dep.notify();
      }
    });
  }
};

function observe(value, vm) {
  // 如果value不是, 不用做劫持
  if (!value || typeof value !== 'object') {
    return;
  }

  // 创建对应的observer对象
  return new Observer(value);
};


var uid = 0;

function Dep() {
  this.id = uid++;
  this.subs = [];
}

Dep.prototype = {
  addSub: function (sub) {
    this.subs.push(sub);
  },

  depend: function () {
    Dep.target.addDep(this);
  },

  removeSub: function (sub) {
    var index = this.subs.indexOf(sub);
    if (index != -1) {
      this.subs.splice(index, 1);
    }
  },

  notify: function () {
    // 通知所有相关的watcher
    this.subs.forEach(function (sub) {
      sub.update();
    });
  }
};

Dep.target = null;