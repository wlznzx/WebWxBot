const fs = require('fs');
const http = require('http');
const https = require('https');
const EventEmitter = require('events');
const qrcode = require('qrcode-terminal');
const querystring = require("querystring");

const {
  getUrls, CODES, SP_ACCOUNTS, PUSH_HOST_LIST,
} = require('./conf');

let URLS = getUrls({});
/*
const fetchUUID = async function() {
	let result;
	    try {
	      result = await req.get(URLS.API_jsLogin, {
	        params: {
	          appid: 'wx782c26e4c19acffb',
	          fun: 'new',
	          lang: 'zh_CN',
	          _: +new Date,
	        },
	      });
	    } catch (e) {
	      debug('fetch uuid network error', e);
	      // network error retry
	      return;
	    }
}
*/

function getUUID(argument) {
	// body...
	// let url = 'https://login.weixin.qq.com/jslogin';
	/**/
	https.get('https://login.weixin.qq.com/jslogin?appid=wx782c26e4c19acffb&fun=new&lang=zh_CN', (res) => {
	  console.log('statusCode:', res.statusCode);
	  console.log('headers:', res.headers);
	  res.on('data', (d) => {
	  	process.stdout.write(d);
	  	// console.log(d);
	  	var data = d.toString();
	  	const uuid = data.match(/uuid = "(.+)";$/)[1];
	  	console.log('\n' + uuid);
	  	return uuid;
	  });
	}).on('error', (e) => {
	  console.error(e);
	});
}

async function runAsync(){
	var p = await new Promise(function(resolve, reject){
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


class wx{
	

	async run() {
		let uuid = await this.fetchUUID();
		this.uuid = uuid;
    	console.log('uuid = ' + uuid);
    	this.showQRCODE(uuid);
    	console.log('请在手机端扫码绑定.');
    	let login = await this.checkLoginStep();
    	// this.checkLoginStep();
    	console.log('login = ' + login);

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
  	async showQRCODE(uuid){
  		// 判断uuid是字符串;
  		qrcode.generate(URLS.QRCODE_PATH + uuid,function(qrcode){
  			console.log(qrcode);
  		});
  	}


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
		    headers: {
			    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
			    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_2) ' +
			    'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/50.0.2652.0 Safari/537.36',
			    Referer: 'https://wx2.qq.com/',
			}
		};

  		console.log(params);

  		/**/
	    let p = new Promise(function(resolve, reject){
	        //做一些异步操作
	        function _login(argument) {
	        	const req = https.request(options, (res) => {
				  console.log('statusCode:', res.statusCode);
				  console.log('headers:', res.headers);
				  res.on('data', (d) => {
				    process.stdout.write(d);
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
  	}
  	// Step 3 等待扫码;
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


