const Datastore = require('nedb');


class WxDao{

	initDB(){
		// member store
	    this.Members = new Datastore('./member.db');
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

    // try {
    //   await this.fetchBatchgetContact([groupId]);
    // } catch (e) {
    //   console.log('fetchBatchgetContact error', e);
    //   return null;
    // }

    // group = await this.Groups.findOneAsync({ UserName: groupId });

    // return group;
	}

	async updateGroupMembers(argument){
		this.GroupMembers.update(argument);
	}

	async getGroupMember(id, groupId) {
	    let member = await this.GroupMembers.findOneAsync({
	      UserName: id,
	      GroupUserName: groupId,
		});
		if (member) return member;
	}
}

module.exports = WxDao;