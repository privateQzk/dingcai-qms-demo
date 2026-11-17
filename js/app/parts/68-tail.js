  }
}).use(ElementPlus, { locale: ElementPlusLocaleZhCn });
if (typeof VxeUI !== 'undefined') app.use(VxeUI);
if (typeof VXETable !== 'undefined') app.use(VXETable);
if (window.QMS_COMPONENTS) { Object.keys(window.QMS_COMPONENTS).forEach(function (n) { app.component(n, window.QMS_COMPONENTS[n]); }); }
app.mount('#app');
