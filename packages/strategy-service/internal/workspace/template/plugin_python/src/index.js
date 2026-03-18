import Vue from 'vue'
import App from './js/App'
import smartx_ui from '@xtp-smart/ui'
import iView from 'iview';

Vue.use(smartx_ui);
Vue.use(iView);
import '!style-loader!css-loader!iview/dist/styles/iview.css';
import '@xtp-smart/style/dist/css/smartx.min.css'

smart.on_init(function () {
	console.log("onInit");

	const globalApp = new Vue({
		render: h => h(App),
	}).$mount('#app');

	smart.runPython("./start.py");
});