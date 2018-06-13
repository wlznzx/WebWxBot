const Datastore = require('nedb');


class WxDao{

	initDB(){
		// member store
	    this.Members = new Datastore(); // 所有成员
	    this.Contacts = new Datastore(); // 联系人
	    this.Groups = new Datastore();	// 讨论组信息
	    // this.GroupMembers = new Datastore({filename:'E:/NodeJSCode/db/GroupMembers.db',autoload: true });
	    this.GroupMembers = new Datastore(); // 讨论组成员信息
	    this.Brands = new Datastore(); // 公众帐号
	    this.SPs = new Datastore(); // 特殊帐号
	    // indexing
	    this.Members.ensureIndex({ fieldName: 'UserName', unique: true });
	    this.Contacts.ensureIndex({ fieldName: 'UserName', unique: true });
	    this.Groups.ensureIndex({ fieldName: 'UserName', unique: true });
	    this.Brands.ensureIndex({ fieldName: 'UserName', unique: true });
	    this.SPs.ensureIndex({ fieldName: 'UserName', unique: true });
	}

	constructor(options = {}) {
    	// initDB();
  	}

	async getMember(id) {
    	const member = await this.Members.findOneAsync({ UserName: id });
    	return member;
  	}

  	async getGroup(groupId) {
    let group = await this.Groups.findOneAsync({ UserName: groupId });
    if (group) return group;
	}

	async getGroupMember(id, groupId) {
	    let member = await this.GroupMembers.findOneAsync({
	      UserName: id
	      // GroupUserName: groupId,
		});
		if (member) return member;
	}

	async updateGroupMembers(query,updateQuery){
		await this.GroupMembers.update(query,updateQuery,{upsert: true});
	}
}

let singleton = null;

function getInstance(){
	if(singleton == null){
		singleton = new WxDao();
		singleton.initDB();
	}else{

	}
	return singleton;
}

module.exports = getInstance;