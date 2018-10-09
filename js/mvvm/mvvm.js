/*
相当于Vue函数
options: 配置对象
 */
function MVVM(options) {
  // 保存配置对象到vm
  this.$options = options;
  // 保存data数据对象到vm和data变量
  var data = this._data = this.$options.data;
  // 保存vm到me变量
  var me = this;

  // 遍历data中所有属性
  Object.keys(data).forEach(function (key) {// key就属性名
    // 对指定属性实现数据代理
    me._proxy(key);
  });

  // 对data中所有层次属性进行监视/劫持
  observe(data, this);

  // 创建并保存用于编译模板的Complie对象
  this.$compile = new Compile(options.el || document.body, this)
}

MVVM.prototype = {
  $watch: function (key, cb, options) {
    new Watcher(this, key, cb);
  },

  _proxy: function (key) {
    // 保存vm到me变量
    var me = this;
    // 给vm添加指定名称的属性
    Object.defineProperty(me, key, {
      configurable: false, // 不可以重新定义
      enumerable: true, // 可枚举遍历
      // 当执行vm.name获取属性值时自动调用返回属性值
      get: function proxyGetter() {
        // 读取data中对应的属性值返回
        return me._data[key];
      },
      // 当执行vm.name = "xxx"时自动调用
      set: function proxySetter(newVal) {
        // 将最新的值保存给data对应的属性上
        me._data[key] = newVal;
      }
    });
  }
};