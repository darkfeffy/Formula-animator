

var Node = function(f, handle){
	//ids of children
	this.NODE ={
			base: {type:'unknown', code:'?'},
			children: {
				OP: {
					base: {type:'op', code:'?', type:'op', op:'unknown'},
					children: {
						MULT: {base:{op:'mult', code:'*'}, children:{}}, //
						DIV: {base:{op:'div', code:'/'}, children:{}}, //top -> bottom, numerator to denominator
						ADD: {base:{op:'plus', code:'+'}, children:{}},
						SUB: {base:{op:'sub', code:'-'}, children:{}},
						EXPO: {base:{op:'power', code:'^'}, children:{}},
						EQ: {base:{op:'eq', code:'='}, children:{}},
						PAREN: {base:{op:'paren',code:'()', children:{}}}
					}
				},
				VAR: {base:{type:'variable', name:null},children:{}},
				NUMBER: {base:{type:'number', value:null},children:{}}
			}
	}
	this.eval = function(){
		var type = this.data('type');
		var op = this.data('op');
		switch(type){
			case 'variable':
				return this.data('name');
			case 'number':
				return this.data('value');
			case 'op':
				switch(op){
					case 'plus': var ex = function(a,b){return a+b}; break;
					case 'mult': var ex = function(a,b){return a*b}; break;
					case 'div': var ex = function(a,b){return a/b}; break;
					case 'sub': var ex = function(a,b){return a-b}; break;
					case 'power': var ex = function(a,b){return pow(a,b)}; break;
					case 'eq': var ex = function(a,b){return a}; break;
					case 'paren': var ex = function(a,b){return a}; break;
				}
				var res;
				for(var i=1; i < this.children.length; i++){
					if(i == 1){
						var res = ex(this.child(0).eval(), this.child(1).eval());
					}
					else{
						var res = ex(res, this.child(i).eval());
					}
				}
				if(this.children.length == 1){
					var res = this.childAt(0).eval();
				}
				return res;
		}
	}
	this.foreach_child = function(cbk){
		var f = this.formula;
		for(var i=0; i < this.children.length; i++){
			cbk(f.get(this.children[i]),i);
		}
	}
	this.add_child = function(child_id, tofront){
		if(isUndefined(tofront) || ! tofront){
			if(this.children.indexOf(child_id) < 0)
				this.children.push(child_id);
		}
		else {
			if(this.children.indexOf(child_id) < 0)
				this.children.unshift(child_id);
		}
	}
	this.init = function(f,handle){
		var that = this;
		var cobble_data = function(data,name){
			var node = {}; //copy base info.
			for(var b in data.base){
				node[b] = copyData(data.base[b]);
			}
			if(name == handle){
				return {found:true, data:node};
			}
			else{
				for(child in data.children){
					var res = cobble_data(data.children[child], child);
					//copy returned structure.
					if(res.found){
						for(var k in node){
							if(!(k in res.data))
								res.data[k] = node[k];
						}
						return {found:true, data:res.data}; //exists in one of our children.
					}
				}
			}
			//did not find this.

			return {found:false, data:{}};
		}
		var data = cobble_data(this.NODE,'NODE').data;
		this.HANDLE = handle;
		this.id = f.fresh_id();
		this.parent_id = -1;
		this.children = [];
		this.formula = f;
		this._data = data;
		return data;
	}
	this.replace = function(new_id){
		var f = this.formula;
		var par = this.parent();
		if(par != null){
			var vid = this.id;
			par.foreach_child(function(c,i){
				if(c.id == vid){
					console.log(i,c.print())
					par.children[i] = new_id;
				}
			})
			f.get(new_id).parent_id = this.parent_id;
			this.parent_id = -1;
		}
		else{
			f.get(new_id).parent_id = -1;
			if(f.root().id == this.id){
				f.set_root(new_id);
			}
		}
		return this;
	}
	this.remove = function(child_to_moveup){
		this.replace(child_to_moveup);
	}
	this.data = function(key){
		return this._data[key];
	}
	this.set = function(key, value){
		this._data[key] = value;
	}
	this.set_parent = function(id,tofront){
		var f = this.formula;
		this.parent_id = id;
		var par = f.get(id);
		if(par != null){
			par.add_child(this.id,tofront);
		}
	}
	this.parent = function(){
		var f = this.formula;
		return f.get(this.parent_id);
	}
	this.child = function(i){
		var f = this.formula;
		return f.get(this.children[i]);
	}
	this.print = function(){
		var f = this.formula;
		var str = "";
		var type = this.data('type');
		var op = this.data('op');
		if(type == "op" && op == "paren"){
			var chl = f.get(this.children[0]);
			str += "(";
			str += chl.print();
			str += ")";
		}
		else if(type == 'op'){
			for(var i in this.children){
				var chl = f.get(this.children[i]);
				if(i > 0){
					str += (this.data('code'));
				}
				str += chl.print();
			}
		}
		else if(type == 'variable'){
			str = this.data('code');
		}
		else if(type == 'number'){
			str = (this.data('code'));
		}
		return str;
	}
	/*
	Given a formula, find all the ancestors.
	*/
	this.ancestors = function(){
		var f = this.formula;
		var ancestors = function(d){
			var a = {};
			d.foreach_child(function(child){
				var child_id = child.id;
				a[child_id] = child;

				var anc = ancestors(child);
				for(var ancestor in anc){
					a[ancestor] = anc[ancestor];
				}
			});
			return a;
		}
		var a = ancestors(this);
		a[this.id] = this;
		return a;

	}
	this.copy = function(parent){
		var f = this.formula;
		var n = new Node(this.HANDLE, f.fresh_id(), parent);
		n._data = copyData(this._data);
		return n;
	}
	this.set_formula = function(f){
		this.formula = f;
	}
	this.foreach_subtree = function(cbk){
		cbk(this);
		this.foreach_child(function(node){
			cbk(node);
			node.foreach_subtree(node);
		});
	}
	this.find = function(expr){
		var f = this.formula;
		return f.find(expr, this.ancestors());
	}
	this.copy_subtree = function(){
		var f = this.formula;
		var anc = this.ancestors(f);
		var mappings = {};
		var nodes = {};
		for(a in anc){
			var el = anc[a].copy;
			mappings[el.id] = f.fresh_id();
			el.id = mappings[el.id];
			nodes[el.id] = el;
		}
		for(a in anc){
			var el = anc[a];
			var pid = el.parent_id;
			if(pid in mappings){
				el.parent_id = mappings[pid];
			}
			else{
				el.parent_id = -1;
			}
			this.foreach_child(f,function(child,i){
				var cid = child.id;
				if(cid in mappings){
					el.children[i] = mappings[cid];
				}
				else{
					el.children[i] = -1;
				}
			})
		}
		return nodes;
	}
	this.init(f,handle);
}
var Formula = function(){

	this.init = function(){
		this.nodes = {};
		this.ID = 0;
		this.root_id = -1;
	}
	this.has = function(id){
		return (id in this.nodes);
	}
	this.set_root = function(id){
		this.root_id = id;
	}
	this.root = function(){
		return this.get(this.root_id);
	}
	this.add = function(handle){
		var node = new Node(this, handle);
		this.nodes[node.id] = node;
		return node;
	}
	this.fresh_id = function(){
		var id= this.ID;
		this.ID++;
		return id;
	}
	this.get = function(id){
		if(this.has(id)) return this.nodes[id];
		else return null;
	}
	this.copy = function(){
		var f = new Formula();
		f.nodes = copyData(this.nodes);
		f.ID = this.ID;
		return f;
	}

	/*
	# #id : id number of a node
	# field:val : field is a particular value
	# %parent_id : is child of this parent.
	# %%ancestor_id : is an ancestor of this parent.
	# a b : a and b
	# a,b : a or b
	*/
	this.to_checker = function(exp){
		var combine = function(a,b){return a||b};
		var subexp = exp.split(",");
		if(subexp.length == 1){
			var combine = function(a,b){return a&&b};
			subexp = exp.split(' ');
		}
		var predicates = function(){return true;};
		for(var i=0; i < subexp.length; i++){
			var pred = subexp[i];
			if(pred.startsWith("#")){
				var check_id = parseInt(se.substring(1))
				var new_pred = function(comb,prev, checkid){
					return function(node){return comb( prev(node), checkid==node.id) }
				}(combine,predicates,check_id);
				var predicates = new_pred;
			}
			else if(pred.startsWith("%%")){
				var check_id = parseInt(se.substring(2));
				var anc = this.get(check_id).ancestors(this);
				var new_pred = function(comb,prev, anc){
					return function(node){return comb( prev(node), node.id in anc) }
				}(combine,predicates,anc);
				var predicates = new_pred;
			}
			else if(pred.startsWith("%")){
				var check_id = parseInt(se.substring(1));
				var new_pred = function(comb,prev, checkid){
					return function(node){return comb( prev(node), checkid==node.parent_id) }
				}(combine,predicates,check_id);
				var predicates = new_pred;
			}
			else {
				var args = pred.split(":");
				var key = args[0];
				var value = args[1];
				var new_pred = (function(comb,prev, key,value){
					return function(node){return comb( prev(node), node.data(key) == value) }
				})(combine,predicates,key, value);
				var predicates = new_pred;
			}
		}
		return predicates;
	}
	this.find = function(exp, from){
		var checker = this.to_checker(exp);
		var nodes = {};
		if(isUndefined(from)){
				for(n in this.nodes){
					nodes[n] = this.nodes[n];
				}
		}
		else{
			nodes = from;
		}
		for(id in nodes){
			if(!checker(nodes[id])){
				delete nodes[id];
			}
		}
		return nodes;
	}


	this.toString = function(){
		return JSON.stringify(this.nodes,null,2);
	}
	this.print = function(){
		return this.root().print(this);
	}

	this.cleanup_and_reassign = function(){
		var tree = this.root().ancestors();
		var cnt = 0;
		var mapping = {};
		//initialize to 0
		for(var id in this.nodes){
			if(! (id in tree)){
				delete this.nodes[id];
			}
			else{
				mapping[id] = cnt;
				cnt++;
			}
		}
		for(var id in this.nodes){
			var node = this.nodes[id];
			node.id = mapping[node.id];
			node.parent_id = mapping[node.parent_id];
			for(var i=0; i < node.children.length; i++){
				node.children[i] = mapping[node.children[i]];
			}
			delete this.nodes[id];
			this.nodes[mapping[id]] = node;


		}
		this.root_id = mapping[this.root_id];
		this.ID = cnt;
	}
	this.cleanup = function(){
		var tree = this.root().ancestors();
		var cnt = 0;
		var mapping = {};
		//initialize to 0
		for(var id in this.nodes){
			if(! (id in tree)){
				delete this.nodes[id];
			}
			else{
				mapping[id] = cnt;
				cnt++;
			}
		}
		for(var id in this.nodes){
			var node = this.nodes[id];
			node.id = mapping[node.id];
			node.parent_id = mapping[node.parent_id];
			for(var i=0; i < node.children.length; i++){
				node.children[i] = mapping[node.children[i]];
			}
			delete this.nodes[id];
			this.nodes[mapping[id]] = node;


		}
		this.root_id = mapping[this.root_id];
		this.ID = cnt;

	}
	this.init();
}
