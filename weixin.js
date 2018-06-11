const fs = require('fs');
const http = require('http');
const https = require('https');
const qrcode = require('qrcode-terminal');
const querystring = require("querystring");
const axios = require('axios');
const request_info = require("./request_info");
const url = require('url');
const path = require('path');
const FileCookieStore = require('tough-cookie-filestore');
const axiosCookieJarSupport = require('node-axios-cookiejar');
const touch = require('touch');
const tough = require('tough-cookie');
const EventEmitter = require('events');

const {
  getUrls, CODES, SP_ACCOUNTS, PUSH_HOST_LIST,
} = require('./conf');

let URLS = getUrls({});


const cookiePath = path.join(process.cwd(), '.cookie.json');
touch.sync(cookiePath);
const jar = new tough.CookieJar(new FileCookieStore(cookiePath));

const req = axios.create({
  timeout: 35e3,
  headers: request_info.headers,
  jar,
  withCredentials: true,
  xsrfCookieName: null,
  xsrfHeaderName: null,
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

axiosCookieJarSupport(req);

const makeDeviceID = () => 'e' + Math.random().toFixed(15).toString().substring(2, 17);

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
	    // this.Members = new Datastore();
	    // this.Contacts = new Datastore();
	    // this.Groups = new Datastore();
	    // this.GroupMembers = new Datastore();
	    // this.Brands = new Datastore(); // 公众帐号
	    // this.SPs = new Datastore(); // 特殊帐号

	    // // indexing
	    // this.Members.ensureIndex({ fieldName: 'UserName', unique: true });
	    // this.Contacts.ensureIndex({ fieldName: 'UserName', unique: true });
	    // this.Groups.ensureIndex({ fieldName: 'UserName', unique: true });
	    // this.Brands.ensureIndex({ fieldName: 'UserName', unique: true });
	    // this.SPs.ensureIndex({ fieldName: 'UserName', unique: true });

	    clearTimeout(this.checkSyncTimer);
	    clearInterval(this.updataContactTimer);
  	}
  	// Step 1 获取UUID.
  	async fetchUUID() {
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
      console.log('fetch uuid network error', e);
      // network error retry
      return await this.fetchUUID();
    }

    const { data } = result;

    if (!/uuid = "(.+)";$/.test(data)) {
      throw new Error('get uuid failed');
    }

    const uuid = data.match(/uuid = "(.+)";$/)[1];
    return uuid;
  	}

  	/*
  	async fetchUUID() {
  			let p =  new Promise(function(resolve, reject){
	        //做一些异步操作
			https.get('https://login.weixin.qq.com/jslogin?appid=wx782c26e4c19acffb&fun=new&lang=zh_CN', (res) => {
			res.on('data', (d) => {
				var data = d.toString();
				const uuid = data.match(/uuid = "(.+)";$/)[1];
				  	resolve(uuid);
				});
			}).on('error', (e) => {
				  console.error(e);
			});
	    	});
	    
	    this.uuid = await p;
  	}
  	*/

  	// Step 2 显示二维码;
  	async showQRCODE(){
  		// 判断uuid是字符串;
  		const qrcodeUrl = URLS.QRCODE_PATH + this.uuid;
  		qrcode.generate(qrcodeUrl.replace('/qrcode/', '/l/') , function(qrcode){
  			console.log(qrcode);
  		});
  	}

  	// Step 3 等待扫码;

  	/*
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
  	}
  	*/

  	async checkLoginStep() {
    let result;

	    try {
	      result = await req.get(URLS.API_login, {
	        params: {
	          tip: 1,
	          uuid: this.uuid,
	          _: +new Date,
	        },
	      });
	    } catch (e) {
	      console.log('checkLoginStep network error', e);
	      await this.checkLoginStep();
	      return;
	    }

	    const { data } = result;

	    if (!/code=(\d{3});/.test(data)) {
	      // retry
	      return await this.checkLoginStep();
	    }

	    const loginCode = parseInt(data.match(/code=(\d{3});/)[1], 10);

	    switch (loginCode) {
	      case 200:
	        console.log('已点击确认登录!');
	        this.redirectUri = data.match(/redirect_uri="(.+)";$/)[1] + '&fun=new';
	        this.baseHost = url.parse(this.redirectUri).host;
	        URLS = getUrls({ baseHost: this.baseHost });
	        break;

	      case 201:
	        console.log('二维码已被扫描，请确认登录!');
	        break;

	      case 408:
	        console.log('检查登录超时，正在重试...');
	        break;

	      default:
	        console.log('未知的状态，重试...');
	    }

	    return loginCode;
	  }
	

	async fetchTickets() {
    let result;
    try {
      result = await req.get(this.redirectUri);
    } catch (e) {
      console.log('fetch tickets network error', e);
      // network error, retry
      await this.fetchTickets();
      return;
    }

    const { data } = result;

    if (!/<ret>0<\/ret>/.test(data)) {
      throw new Error('Get skey failed, restart login');
    }

    // const retM = data.match(/<ret>(.*)<\/ret>/);
    // const scriptM = data.match(/<script>(.*)<\/script>/);
    const skeyM = data.match(/<skey>(.*)<\/skey>/);
    const wxsidM = data.match(/<wxsid>(.*)<\/wxsid>/);
    const wxuinM = data.match(/<wxuin>(.*)<\/wxuin>/);
    const passTicketM = data.match(/<pass_ticket>(.*)<\/pass_ticket>/);
    // const redirectUrl = data.match(/<redirect_url>(.*)<\/redirect_url>/);

    this.skey = skeyM && skeyM[1];
    this.sid = wxsidM && wxsidM[1];
    this.uin = wxuinM && wxuinM[1];
    this.passTicket = passTicketM && passTicketM[1];
    console.log(`
      获得 skey -> ${this.skey}
      获得 sid -> ${this.sid}
      获得 uid -> ${this.uin}
      获得 pass_ticket -> ${this.passTicket}
    `);

    this.baseRequest = {
      Uin: parseInt(this.uin, 10),
      Sid: this.sid,
      Skey: this.skey,
      DeviceID: this.deviceid,
    };
    /*
    fs.writeFileSync(secretPath, JSON.stringify({
      skey: this.skey,
      sid: this.sid,
      uin: this.uin,
      passTicket: this.passTicket,
      baseHost: this.baseHost,
      baseRequest: this.baseRequest,
    }), 'utf8');
*/
  }

	async webwxinit() {
    let result;
    try {
      result = await req.post(
        URLS.API_webwxinit,
        { BaseRequest: this.baseRequest },
        {
          params: {
            pass_ticket: this.passTicket,
            skey: this.skey,
          },
        }
      );
    } catch (e) {
      debug('webwxinit network error', e);
      // network error retry
      await this.webwxinit();
      return;
    }

    const { data } = result;

    if (!data || !data.BaseResponse || data.BaseResponse.Ret !== 0) {
      throw new Error('Init Webwx failed');
    }

    this.my = data.User;
    this.syncKey = data.SyncKey;
    this.formateSyncKey = this.syncKey.List.map((item) => item.Key + '_' + item.Val).join('|');
  }

  async notifyMobile() {
    let result;
    try {
      result = await req.post(
        URLS.API_webwxstatusnotify,
        {
          BaseRequest: this.baseRequest,
          Code: CODES.StatusNotifyCode_INITED,
          FromUserName: this.my.UserName,
          ToUserName: this.my.UserName,
          ClientMsgId: +new Date,
        },
        {
          params: {
            lang: 'zh_CN',
            pass_ticket: this.passTicket,
          },
        }
      );
    } catch (e) {
      console.log('notify mobile network error', e);
      // network error retry
      await this.notifyMobile();
      return;
    }

    const { data } = result;

    if (!data || !data.BaseResponse || data.BaseResponse.Ret !== 0) {
      throw new Error('通知客户端失败');
    }
  }

	async lookupSyncCheckHost() {
    for (let host of PUSH_HOST_LIST) {
      let result;
      try {
        result = await req.get('https://' + host + '/cgi-bin/mmwebwx-bin/synccheck', {
          params: {
            r: +new Date,
            skey: this.skey,
            sid: this.sid,
            uin: this.uin,
            deviceid: this.deviceid,
            synckey: this.formateSyncKey,
            _: +new Date,
          },
        });
      } catch (e) {
        console.log('lookupSyncCheckHost network error', host);
        // network error retry
        break;
      }

      const { data } = result;

      const retcode = data.match(/retcode:"(\d+)"/)[1];
      if (retcode === '0') return host;
    }
  }


	async syncCheck() {
    let result;
    try {
      result = await req.get(
        URLS.API_synccheck,
        {
          params: {
            r: +new Date(),
            skey: this.skey,
            sid: this.sid,
            uin: this.uin,
            deviceid: this.deviceid,
            synckey: this.syncKey,
            _: +new Date(),
          },
        }
      );
    } catch (e) {
      debug('synccheck network error', e);
      // network error retry
      return await this.syncCheck();
    }

    const { data } = result;

    console.log('check data = ' + data);

    const retcode = data.match(/retcode:"(\d+)"/)[1];
    const selector = data.match(/selector:"(\d+)"/)[1];



    console.log('retcode = ' + retcode);
    if (retcode !== '0') {
      // this.runLoop();
      return;
    }

    if (selector !== '0') {
      // this.webwxsync();
    }

    clearTimeout(this.checkSyncTimer);
    this.checkSyncTimer = setTimeout(() => {
      this.syncCheck();
    }, 3e3);
  }

async fetchContact() {
    let result;
    console.log('URLS.API_webwxgetcontact = ' + URLS.API_webwxgetcontact);
        console.log('this.passTicket = ' + this.passTicket);
        console.log('this.skey = ' + this.skey);
    try {
      result = await req.post(
        URLS.API_webwxgetcontact,
        {},
        {
          params: {
            pass_ticket: this.passTicket,
            skey: this.skey,
            r: +new Date,
          },
        }
      );
    } catch (e) {
      console.log('fetch contact network error', e);
      // network error retry
      await this.fetchContact();
      return;
    }

    const { data } = result;
    console.log(result);
    console.log(data);

    if (!data || !data.BaseResponse || data.BaseResponse.Ret !== 0) {
      throw new Error('获取通讯录失败');
    }

    // this.Members.insert(data.MemberList);
    // this.totalMemberCount = data.MemberList.length;
    // this.brandCount = 0;
    // this.spCount = 0;
    // this.groupCount = 0;
    // this.friendCount = 0;
    // data.MemberList.forEach((member) => {
    //   const userName = member.UserName;

    //   if (member.VerifyFlag & CODES.MM_USERATTRVERIFYFALG_BIZ_BRAND) {
    //     this.brandCount += 1;
    //     this.Brands.insert(member);
    //     return;
    //   }

    //   if (SP_ACCOUNTS.includes(userName) || /@qqim$/.test(userName)) {
    //     this.spCount += 1;
    //     this.SPs.insert(member);
    //     return;
    //   }

    //   if (userName.includes('@@')) {
    //     this.groupCount += 1;
    //     this.Groups.insert(member);
    //     return;
    //   }

    //   if (userName !== this.my.UserName) {
    //     this.friendCount += 1;
    //     this.Contacts.insert(member);
    //   }
    // });

    console.log(`
      获取通讯录成功
      全部成员数: ${this.totalMemberCount}
      公众帐号数: ${this.brandCount}
      特殊帐号数: ${this.spCount}
      通讯录好友数: ${this.friendCount}
      加入的群聊数(不准确，只有把群聊加入通讯录才会在这里显示): ${this.groupCount}
    `);
  }
  	
  	async run() {
		// await this.fetchUUID();
		// console.log('uuid = ' + this.uuid);
		this.initConfig();
	    try {
	      this.uuid = await this.fetchUUID();
	    } catch (e) {
	      console.log('fetch uuid error', e);
	      // this.init();
	      return;
	    }
    	this.showQRCODE();
    	console.log('请在手机端扫码绑定...');

    	// let login = await this.checkLoginStep();
	    this.checkTimes = 0;
	    while (true) {
	      const loginCode = await this.checkLoginStep();
	      if (loginCode === 200) break;

	      if (loginCode !== 201) this.checkTimes += 1;

	      if (this.checkTimes > 6) {
	        console.log('检查登录状态次数超出限制，重新获取二维码');
	        this.init();
	        return;
	      }
	    }
	    await this.fetchTickets();

	    await this.webwxinit();


	    console.log('初始化成功!');

	    // try {
	      console.log('正在通知客户端网页端已登录...');
	      await this.notifyMobile();

	      console.log('正在获取通讯录列表...');
	      await this.fetchContact();
	    // } catch (e) {
	    //   console.log('初始化信息失败，正在重试');
	    // }
	    

	    this.pushHost = await this.lookupSyncCheckHost();

    	URLS = getUrls({ baseHost: this.baseHost, pushHost: this.pushHost });

        console.log('this.skey = ' + this.skey);
        console.log('this.sid = ' + this.sid);
        console.log('this.uin = ' + this.uin);
        console.log('this.deviceid = ' + this.deviceid);
        console.log('this.formateSyncKey = ' + this.formateSyncKey);


    	this.syncCheck();
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


