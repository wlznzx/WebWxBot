const fs = require('fs');
const http = require('http');
const https = require('https');
const EventEmitter = require('events');
const qrcode = require('qrcode-terminal');
const querystring = require("querystring");
const request_info = require("./request_info");

const {
  getUrls, CODES, SP_ACCOUNTS, PUSH_HOST_LIST,
} = require('./conf');

let URLS = getUrls({});

class wx{
	initConfig() {
	    this.baseHost = '';
	    this.pushHost = '';
	    this.uuid = '';
	    this.redirectUri = '';
	    this.skey = '';
	    this.sid = '';
	    this.uin = '';
	    this.passTicket = '';
	    this.baseRequest = null;
	    this.my = null;
	    this.syncKey = null;
	    this.formateSyncKey = '';
	    this.deviceid = makeDeviceID();

	    // member store
	    this.Members = new Datastore();
	    this.Contacts = new Datastore();
	    this.Groups = new Datastore();
	    this.GroupMembers = new Datastore();
	    this.Brands = new Datastore(); // 公众帐号
	    this.SPs = new Datastore(); // 特殊帐号

	    // indexing
	    this.Members.ensureIndex({ fieldName: 'UserName', unique: true });
	    this.Contacts.ensureIndex({ fieldName: 'UserName', unique: true });
	    this.Groups.ensureIndex({ fieldName: 'UserName', unique: true });
	    this.Brands.ensureIndex({ fieldName: 'UserName', unique: true });
	    this.SPs.ensureIndex({ fieldName: 'UserName', unique: true });

	    clearTimeout(this.checkSyncTimer);
	    clearInterval(this.updataContactTimer);
  	}
  	// Step 1 获取UUID.
  	async fetchUUID() {
	    var p = new Promise(function(resolve, reject){
	        //做一些异步操作
	        function _getUUID(argument) {
				https.get('https://login.weixin.qq.com/jslogin?appid=wx782c26e4c19acffb&fun=new&lang=zh_CN', (res) => {
				  // console.log('statusCode:', res.statusCode);
				  // console.log('headers:', res.headers);
				  res.on('data', (d) => {
				  	// process.stdout.write(d);
				  	var data = d.toString();
				  	const uuid = data.match(/uuid = "(.+)";$/)[1];
				  	// console.log('\n' + uuid);
				  	resolve(uuid);
				  });
				}).on('error', (e) => {
				  console.error(e);
				});
			}
			_getUUID();
	    });
	    return p;
  	}
  	// Step 2 显示二维码;
  	async showQRCODE(){
  		// 判断uuid是字符串;
  		const qrcodeUrl = URLS.QRCODE_PATH + this.uuid;
  		qrcode.generate(qrcodeUrl.replace('/qrcode/', '/l/') , function(qrcode){
  			console.log(qrcode);
  		});
  	}

  	// Step 3 等待扫码;
  	async checkLoginStep() {
  		let params = querystring.stringify({
		    tip:1,
		    uuid:this.uuid,
		});

		let options = {
		    hostname: 'login.wx.qq.com',
		    port: 443,
		    path: '/cgi-bin/mmwebwx-bin/login?' + params,
		    method: 'GET',
		    headers: request_info.headers
		};
  		console.log(params);
  		/**/
	    let p = new Promise(function(resolve, reject){
	        //做一些异步操作
	        function _login(argument) {
	        	const req = https.request(options, (res) => {
				  res.on('data', (d) => {
				    var data = d.toString();
				    resolve(data);
				  });
				});
				req.on('error', (e) => {
				  console.error(e);
				});
				req.end();
			}
			_login();
	    });
	    return p;
	    /*
	    while (true) {
	    	const data = await p;
		    const loginCode = parseInt(data.match(/code=(\d{3});/)[1], 10);
		    console.log('loginCode = ' + loginCode);
		    if (loginCode === 200) {
		    	this.redirectUri = data.match(/redirect_uri="(.+)";$/)[1] + '&fun=new';
		      	break;
		    }
		    if (loginCode !== 201) {
		      	this.checkTimes += 1;
		    }
	    }
	    */
  	}

  	async fetchTickets() {
  		let url = this.redirectUri;
	    let p = new Promise(function(resolve, reject){
	        //做一些异步操作
	        function _fetch_tickets(argument) {
	        	const req = https.get(url, (res) => {
				  res.on('data', (d) => {
				    var data = d.toString();
				    resolve(data);
				  });
				});
				req.on('error', (e) => {
				  console.error(e);
				});
				req.end();
			}
			_fetch_tickets();
	    });
	    return p;
	}


	async webwxinit() {
	    let result;

	    let body = {
	    	BaseRequest: this.baseRequest
	    }

	    let params = querystring.stringify({
		    pass_ticket: this.passTicket,
		    skey: this.skey
		});

		let options = {
		    hostname: 'wx2.qq.com',
		    port: 443,
		    path: '/cgi-bin/mmwebwx-bin/webwxinit?' + params,
		    method: 'POST',
		    headers: request_info.headers
		};

		var json_body = JSON.stringify(body);

  		console.log(params);
  		/**/
	    let p = new Promise(function(resolve, reject){
	        //做一些异步操作
	        function _webwxinit(argument) {
	        	const req = https.request(options, (res) => {
				  res.on('data', (d) => {
				    var data = d.toString();
				    console.log('_webxinit data = ' + data);
				    resolve(data);
				  });
				});
				req.on('error', (e) => {
				  console.error(e);
				});
				req.end(json_body);
			}
			_webwxinit();
	    });
	    return p;
	  }

/*
	async runLoop() {
	    debug('正在初始化参数...');
	    try {
	      await this.webwxinit();
	    } catch (e) {
	      debug('登录信息已失效，正在重新获取二维码...');
	      this.init();
	      return;
	    }

	    debug('初始化成功!');

	    try {
	      debug('正在通知客户端网页端已登录...');
	      await this.notifyMobile();

	      debug('正在获取通讯录列表...');
	      await this.fetchContact();
	    } catch (e) {
	      debug('初始化信息失败，正在重试');
	      this.runLoop();
	    }

	    debug('通知成功!');
	    debug('获取通讯录列表成功!');

	    // await this.fetchBatchgetContact();
	    this.pushHost = await this.lookupSyncCheckHost();

	    URLS = getUrls({ baseHost: this.baseHost, pushHost: this.pushHost });

	    this.syncCheck();

	    // auto update Contacts every ten minute
	    this.updataContactTimer = setInterval(() => {
	      this.updateContact();
	    }, 1000 * 60 * 10);
	}
*/
  	
  	async run() {
		let uuid = await this.fetchUUID();
		this.uuid = uuid;
    	console.log('uuid = ' + uuid);
    	this.showQRCODE();
    	console.log('请在手机端扫码绑定.');
    	let login = await this.checkLoginStep();
    	// this.checkLoginStep();

	    while (true) {
	    	const data = await this.checkLoginStep();
		    const loginCode = parseInt(data.match(/code=(\d{3});/)[1], 10);
		    console.log('loginCode = ' + loginCode);
		    if (loginCode === 200) {
		    	this.redirectUri = data.match(/redirect_uri="(.+)";$/)[1] + '&fun=new';
		      	break;
		    }
		    if (loginCode !== 201) {
		      	this.checkTimes += 1;
		    }
	    }

	    console.log('this.redirectUri == ' + this.redirectUri);

	    let ticket_data = await this.fetchTickets();
	    if(null != ticket_data){
	    	const skeyM = ticket_data.match(/<skey>(.*)<\/skey>/);
		    const wxsidM = ticket_data.match(/<wxsid>(.*)<\/wxsid>/);
		    const wxuinM = ticket_data.match(/<wxuin>(.*)<\/wxuin>/);
		    const passTicketM = ticket_data.match(/<pass_ticket>(.*)<\/pass_ticket>/);
		    // const redirectUrl = data.match(/<redirect_url>(.*)<\/redirect_url>/);
		    this.skey = skeyM && skeyM[1];
		    this.sid = wxsidM && wxsidM[1];
		    this.uin = wxuinM && wxuinM[1];
		    this.passTicket = passTicketM && passTicketM[1];

	    	this.baseRequest = {
		      Uin: parseInt(this.uin, 10),
		      Sid: this.sid,
		      Skey: this.skey,
		      DeviceID: this.deviceid,
		    };
	    }

	    const { init_data } = await this.webwxinit();
	    if (!init_data || !init_data.BaseResponse || init_data.BaseResponse.Ret !== 0) {
		    // throw new Error('Init Webwx failed');
		}
		this.my = data.User;
		this.syncKey = data.SyncKey;
		this.formateSyncKey = this.syncKey.List.map((item) => item.Key + '_' + item.Val).join('|');
	    console.log('syncKey = ' + syncKey);
  	}
}
/*
var uuid = getUUID('hello');
console.log('\n uuid = ' + uuid);
qrcode.generate(URLS.QRCODE_PATH + uuid, function (qrcode) {
    console.log(qrcode);
});
*/

/*
runAsync().then(function(data){
    console.log(data);
    qrcode.generate(URLS.QRCODE_PATH + data, function (qrcode) {
    	console.log(qrcode);
	});
});
*/

let _wx = new wx();
_wx.run();
// var login =  _wx.checkLoginStep();
// console.log(login);


