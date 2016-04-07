/**
*@name ThemeMap
*@class
*@param {Object} domId 容器ID
*@property {String} name 地图对象名称
*@ThemeMap.Theme类
*@example 
*var theme = new ThemeMap.Theme(documenmt.getElementById("div2"));
*/
var ThemeMap = {};
(function (){ 
	ThemeMap.addMap=_extendMapData; //扩展地图数据
	ThemeMap.Theme=Theme;     //专题图
	ThemeMap.setReqURL=_setRequrl; //设置请求专题图的url
	ThemeMap.setMapBgcolor=_setMapBgcolor;
	ThemeMap.getMapBgcolor=_getMapBg;
	ThemeMap.formatData = _formatData;
	ThemeMap.bgColor='#ccc';
	ThemeMap.requrl='https://ccgis.cn/mapb/'; //
	ThemeMap.port='81';
	ThemeMap.ajaxType='GeoJson';  //GeoJson(编码的数据，需要解码后传给回调函数)、SQLDATA（sql查询）
	ThemeMap.name2GeoField={name:'name',geoField:'name',nameMapping:{}}; //name与指定字段（实际地名）的对应关系
	ThemeMap.GeoField2name={geoField:'name',name:'name',geoMapping:{}};  //实际地名与name的对应关系
	ThemeMap.map_geoNames=[];//默认的地图上各区域的地名（可能是真是地名 也能是代表的id）
	//ThemeMap.name2center={};  //{'闵行区':[121.36,31.26],....}
    ThemeMap.themeSucceed=null; // 专题图生成成功的回调
    ThemeMap._instance=null;  //地图上各区域
    configureEhart();  //配置文件

/**扩展地图数据 {geoDB:,ftSet:,sql:[optional],mapGeoField: name,mapname:[optional]}
*@param geoDB 数据库名
*@param ftSet 要素集名
*@param mapGeoField 指定的字段是地图上各区域的地名字段
*@param mapname:扩展的地图名 可选参数，默认是要素名（用户自定义，请求地图时用该名称，）
*@param sql：可选参数 默认是获取指定的ftSet中的所有要素
*/
function _extendMapData(paramObj){
		var db=paramObj.geoDB;
    	var ftset=paramObj.ftSet;
    	var sql=paramObj.sql || '';
    	var zip=paramObj.zip || false;  
    	var geofield=paramObj.mapGeoField ? paramObj.mapGeoField.split(',')[0] : '';
    	var mapname=paramObj.mapname || ftset;
    	// ThemeMap.name2GeoField.nameMapping=ThemeMap.GeoField2name.geoMapping={};
    	ThemeMap.name2GeoField.geoField=ThemeMap.GeoField2name.geoField=geofield!='' ? geofield: 'name';
   		
   		require('echarts/util/mapData/params').params[mapname] = {
    	getGeoJson: function (callback) { 
    		ThemeMap.ajaxType='GeoJson' ; 
    		var data={
    			"mt":"SQLQuery",
				"format":"geojson",
				"zip":'true',
				"geoDB":db,
				"ftSet":ftset,
				"sql":sql,
				"return":{"shape":1,"fields":geofield}
				};  
			var params={
    			req:JSON.stringify(data)
    		};        
    		// var url="http://"+ThemeMap.requrl+":"+ThemeMap.port+"/WebFeature";
    		var url=ThemeMap.requrl+"/WebFeature";
    		_ajax('POST', url, params, true, callback);
    	}
 	 };   
}
/**
 * 设置请求的url、port
 * @param {[type]} url 设置请求地图数据的url
 */
function _setRequrl(url){
	ThemeMap.requrl=url;
	//ThemeMap.port=port;
}
function _setMapBgcolor(color){
	ThemeMap.bgColor=color || '#ccc';
}
function _getMapBg(){
	return ThemeMap.bgColor;
}
 	//将后台返回的数据格式化,将每条记录转换成{fld1:value1,fld2:value2,....}
function _formatData(data,bindFlds,geoFld){
	    var seriesData = [];  //{name:,data:[{name:'',value:''}]}
	    var max,min;
	   for(var i=0,l=data.length;i<l;i++){
	        var curSeries = {};
	        var rec = data[i];
	        curSeries.name = rec[geoFld];
	        var curData = {};//{fld1:value1,fld2:value2,....}
	        var sum = 0;
	        for(var j=0,len=bindFlds.length;j<len;j++){
	            var fld = bindFlds[j];
	            curData[fld] = rec[fld];
	            sum += (rec[fld]-parseFloat(rec[fld]))+1>=0 ? rec[fld] : 0;
	        }
	        if(i==0){
	        	min = sum;
	        	max = sum;
	        }else{
	        	if(min>sum && min!=0){ //排除0
	        		min = sum;
	        	}
	        	if(max<sum){
	        		max = sum;
	        	}
	        }
	        curSeries.data = curData;
	        curSeries.sum = sum;
	        seriesData.push(curSeries);
	   }
	   seriesData[0].min = min;
	   seriesData[0].max = max;
	   return seriesData;
}
//配置文件 引入依赖模块()
function configureEhart(callback){  
	// ThemeMap.echarts=echarts;  
 //    if(callback!=undefined){
	// 		 	callback(echarts);
	// }

	require.config({
        paths: {  //配置路径
        echarts: 'newlib'
         }
       });
    require([  //引入依赖模块
        'echarts',
        'echarts/chart/map',
        'echarts/chart/bar',
        'echarts/chart/pie',
        // 'echarts/chart/gauge',
         'echarts/chart/radar'
         ],
        function (ec) { 
        	ThemeMap.echarts=ec;  
            if(callback!=undefined){
			 	callback(ec);
			}
           }
       );
}
//专题图
function Theme(dom,option,callback){
	var self=this;
	var _callback;
	this._mapOption=option;
	this.bindOption={};  //绑定数据后的参数配置
	this.pieScript=false;  //是否引入pie脚本
	this.funnelScript=false;  //是否引入funnel脚本
	this.gaugeScript=false;  //是否引入gauge脚本
	this.radarScript =false;
	ThemeMap._instance=this;
	this.legend={pie:[],funnel:[],radar:[]};
	// this.pieLgend=[];  
	// this.funnelLgend=[];

	if(arguments.length>2){
		_callback=callback;
		ThemeMap.themeSucceed=callback;
	}
		ThemeMap.map_geoNames=[];
		this.eChart =ThemeMap.echarts.init(dom);  
    	this.eChart.setOption(option);
    	this.eChart._hasPie=false;
    	this.eChart._hasFunnel=false;
		this.eChart.pieData=[];

		this.eChart.funnelData=[];
		this.eChart.gaugeData=[];
    	this.eChart.on('mapRoam',_mapRoam);  
    	//this.eChart.on('mapSelected',_mapSelected); 
}
//地图漫游
function _mapRoam(evtObj){     //this指向ECharts
	var evtDelta = _getDelta(evtObj.event) ;
	var theme=ThemeMap._instance; 
	var isHasPie=theme.eChart._hasPie;
	var isHasFunnel= theme.eChart._hasFunnel;
	var delSeries=[];
	var _option=this.getOption();
	var allSeries=_option.series;
	var funnelSeries=[]; 
	var pieSeries=[];
	var seriesObj  ={};
	for(var ss=0;ss<allSeries.length;ss++){    //获取专题图上的饼图、漏斗图
		var seriesFlag=allSeries[ss].seriesType;
		if(seriesFlag){
			seriesObj[seriesFlag] = true;
			delSeries.push(allSeries[ss]);  
		}
		// if(seriesFlag=='pie_series' || seriesFlag=='funnel_series'){
		// 	delSeries.push(allSeries[ss]);  
		// }
	}  
		//  先删除已有的饼图、漏斗图
	for(var i=0;i<delSeries.length;i++){
		var obj=delSeries[i];
		var index=_indexOfInArray(obj,allSeries); 
		if(index>=0){ 
			allSeries.splice(index,1);
		}
	}  
	_option.series=allSeries;

	for(var seriesType in seriesObj){
		switch(seriesType){
			case "pie_series":
			_pieChange(evtDelta,theme);
			_option=theme._getPieOption(_option);
			break;
			case "radar_series":
			_radarChange(evtDelta,theme);
			_option=theme._getRadarOption(_option);
			break;
			case "funnel_series":
			_option= theme._getFunnelOption(_option);
			break;
		}
	}
	
	// if(isHasPie){ 
	// 	_pieChange(evtDelta,theme);
	// 	_option=theme._getPieOption(_option);
	// }
	// if(isHasFunnel){
	// 	_option= theme._getFunnelOption(_option);
	// }
	theme.setOption(_option,true);  
}
//缩放时，饼图尺寸响应
function _pieChange(evtDelta,theme){ 
	var arr = theme.pieRadius;    //console.log(arr);   每个radius是数组[innerR,outerR]
	for(var i=0,l=arr.length;i<l;i++){
		_radiusChage(arr[i],evtDelta);
	}
}
//缩放时，雷达图半径的变化
function _radarChange(evtDelta,theme){
	var arr = theme.radarRadius;
	_radiusChage(arr,evtDelta);
}
function _radiusChage(radiusArr,evtDelta){
	if(evtDelta>0){  //放大
		for(var i=0,l=radiusArr.length;i<l;i++){
			radiusArr[i] = radiusArr[i]*1.2;
		}	
	}else if(evtDelta<0){      //缩小
		for(var i=0,l=radiusArr.length;i<l;i++){
		radiusArr[i] =radiusArr[i]/1.2;
		}			
	}
	return radiusArr;

}
 function _getDelta(e) {
        return  typeof e.wheelDelta != 'undefined' && e.wheelDelta || typeof e.detail != 'undefined' && -e.detail;
    }
Theme.prototype={
	/**绑定数据: 将指定的某些字段值绑定到地图上  作为专题图数据
	*@param {data:[] ,bindFields:[],keyField:'' ,geoField:[]}
	*@param bindFields是要绑定的字段[pop,gdp,..]
	*@param keyField为地域名字段，
	*@param geoField要绑定的区域['上海'，'北京'。。] 
	*@param //seriesOption用于设置新绑定数据的series中的其他参数，{roam:true}如是否允许漫游roam、是否显示图例颜色标识以及itemStyle等
	*@param isOverWrite 是否覆盖已有的数据  默认不覆盖
	*/
//2015-12-24 可以增加一个GeoCoord参数，定义每组数据所在的地理位置['上海市':[x,y],'北京市':[x,y]...]
//主要针对keyFld字段值和地图上的地名不匹配的情况
//使用新的chartOption，覆盖已有的option
	bindData:function (options,isOverWrite,chartOption){
		var self=this;
		var data=options.data || [];
		var bindflds=options.bindFields || [];
		var keyfld=options.keyField;
		var mapoptions= chartOption ? _clone(chartOption) : self.getOption(); console.log(mapoptions);
		var series=mapoptions.series;
		var isOverWrite=arguments.length>1 ? isOverWrite: false;
		var dataRange_max= this.getDataRangeMax(data,bindflds);
		if(series!=undefined){
			var maptype = series[0].mapType; 
		}else{
			alert('未指定地图,请在series参数中指定地图');
			return;
		}
		var len=data.length;
		if(len<1){ return;}
		var mappingvalue=ThemeMap.GeoField2name.geoMapping; 
		var key_len=Object.keys(mappingvalue).length;
		var series=[];
		var keyfld_value=[];
		var series_Len=bindflds.length;
		for(var j=0;j<series_Len;j++){  //几个系列的数据
		var seriesName=bindflds[j];
		var bindData=[];
		for(var i=0;i<len;i++){
			var obj=data[i];
			var region=obj[keyfld]; 
			var regionName=region;
			// if(key_len>0){
			// 	regionName=mappingvalue[region];
			// }
			var bindvalue=obj[seriesName];
			var record={name:regionName,value:bindvalue};
			bindData.push(record);
			}
			var tmpseries={name:seriesName,type:'map',mapType:maptype,data:bindData
            };
			series.push(tmpseries);
		}  
		var newLegend={data:bindflds}; //图例
		//var chart_option=self.getOption();
		var chart_option= mapoptions;
		if(isOverWrite){
			chart_option.series=series;
			chart_option.legend.data=bindflds; 
		}else{
			chart_option.series=chart_option.series.concat(series);
			chart_option.legend.data=chart_option.legend.data.concat(bindflds);
		}
		chart_option.dataRange.max = dataRange_max;
		chart_option.dataRange.min = 0;
		//delete chart_option.dataRange.splitList;
		this.bindOption=chart_option;	console.log('chart_option',chart_option);
		this.eChart.setOption(chart_option,isOverWrite);	
	 },
	 //计算数据的dataRange的max值 
	 getDataRangeMax : function (data,bindflds){
	 	var max = 0;
	 	for(var i=0,l=data.length;i<l;i++){
	 		var rec = data[i];
	 		var sum = 0;
	 		for(var j = 0,len = bindflds.length;j<len;j++){
	 			var value = rec[bindflds[j]];
	 			value = (value=='null') ? 0 : parseFloat(value);
	 			sum += value;
	 		} 
	 		if(sum > max) {
	 			max = Math.ceil(sum); 
	 		}
	 	}
	 	return max;
	 },
	
	 removeAllData:function (){
	 	var chart_option=this.getOption();
	 	var mapSeries=chart_option.series;
	 	for(var i=0,len=mapSeries.length;i<len;i++){
	 		if(mapSeries[i].type=='map'){
	 			mapSeries[i].data=[];
	 		}
	 	}
		if(chart_option.legend){
			chart_option.legend.data=[];
		}
		chart_option.dataRange={show:false};
        this.setOption(chart_option,true);
	 },
	 //绑定数据后执行刷新  参数option 配置其他参数
	refresh:function (){
	 	var options=this.bindOption || {}; 
	 	this.eChart.setOption(options,true);
	 },
	 //mapSelected、pieSelected、legendSelected、mapRoam、dblclick、resize
	 on:function (evtType,callback){ 
	 	this.eChart.on(evtType,callback);
	 },
	setOption:function (option,notMerge){ 
	 	if(arguments.length>1){   
	 		this.eChart.setOption(option,notMerge); 
	 	}else{
	 		this.eChart.setOption(option);
	 	}
	 },
	 setTimelineOption:function (){
	 },
	 setSeries:function (series, notMerge){
	 	if(arguments.length>1){
	 		this.eChart.setSeries(series, notMerge);
	 	}else{
	 		this.eChart.setSeries(series);
	 	}
	 },
	 setTitle: function (text,subtext){
	 	var option = this.getOption();
	 	var title = option.title ? option.title : {x:'center'};
	 	title.text = text ? text :'';
	 	title.subtext = subtext ? subtext :'';
	 	option.title = title;
	 	this.eChart.setOption(option);
	 },
	getOption:function (){
	 	return this.eChart.getOption(); //获取的克隆对象
	 },
	getSeries:function (){
	 	return this.eChart.getSeries();
	 },
	 //获取地图上所有区域名
	getGeoNames:function (){  
		return ThemeMap.map_geoNames;
	},
	getMaptype:function (){
		var _option=this.getOption();
		var series=_option.series; 
		var maptype='nomap';  
		if(series){
		for(var i=0,len=series.length;i<len;i++){
			var maptype=series[i].mapType;
			if(maptype){
				return maptype;
			}
		}
		}
		return maptype;
	},
	/**
	*@param maptype 地图名
	*@param pt 数组 地理坐标 [x,y]
	*/
	getPosByGeo:function(maptype,pt){   
		return this.eChart.chart.map.getPosByGeo(maptype,pt);
	},
	/** 添加饼图  pieArr:[param1,param2....]  param1 {name:,center:,radius:,roseType:,pieStyle:,showLegend:}形式如下
	*@param name：闵行区，
	*@param center:[x,y]  ||  '闵行区',  //使用地区中心坐标[x,y]或者地区name 根据name与地图上的地名进行匹配
	*@param data:{field:value,....},
	*@param radius: [R] | [R1,R2]  非环状饼图| 环状饼图  
	*@param roseType: 'radius'|  'area'   可选，生成玫瑰图时使用
	*@param pieStyle  {itemStyle：{}，}        其他的饼图样式设置 itemStyle、selectMode、markLine等
	*@param showLegend:bool,   //可选 是否显示饼图的图例
	*/
	addPies:function (pieArr,chartOption){    
		
		this.eChart._hasPie=true; 
		this.eChart.pieData=this.eChart.pieData.concat(pieArr);  //已添加的饼图数据 刷新时备用
        var option= chartOption ? _clone(chartOption) : this.getOption();  
        //var allSeries=option.series;
		var _option=this._getPieOption(option);	
		var isloadPie=this.pieScript; 
		var theme=this;
		if(!isloadPie){
			require([  //引入依赖模块
        	'echarts/chart/pie'
        	 ],
        	function (ec,pie) {  
        		theme.pieScript=true;  
        		theme.setOption(_option,true);   
           }
       	);
		}else{
			theme.setOption(_option,true);
		} 
	},
	//添加漏斗图
	addFunnel:function (funnelData,chartOption){
		
		this.eChart._hasFunnel=true; 
		this.eChart.funnelData=this.eChart.funnelData.concat(funnelData); 
		var theme=this;
		 var option= chartOption ? _clone(chartOption) : this.getOption();  
		var allSeries=option.series;
		var mapoption=this._getFunnelOption(option);
		var isloadFunnel=this.funnelScript;
		if(!isloadFunnel){   
			require(['echarts/chart/funnel'], function (ec,funnel) { //引入依赖模块
        		theme.funnelScript=true;  
        		theme.setOption(mapoption,true);   
            	}
        	);
		}else{
			theme.setOption(mapoption,true);
		}	
	},
	//添加仪表盘 gaugeSeries
	addGauge: function(gaugeData,chartOption){
		
		this.eChart._hasGauge=true; 
		this.eChart.gaugeData=this.eChart.gaugeData.concat(gaugeData);  //已添加的饼图数据 刷新时备用
        var option= chartOption ? _clone(chartOption) : this.getOption();  
		var _option=this._getGaugeOption(option);	
		var isloadGauge=this.gaugeScript;
		var theme=this;
		if(!isloadGauge){
			require([  //引入依赖模块
        	'echarts/chart/gauge'
        	 ],
        	function (ec,gauge) {  
        		theme.gaugeScript=true;  
        		theme.setOption(_option,true);   
           }
       	);
		}else{
			theme.setOption(_option,true);
		} 


	},
	/**
	 * 添加雷达图
	 * @param {Array} radarArr 每个雷达图的信息[ {center:[地理坐标x\y] | 地名,radius,data:{系列1：{fld1:,fld2:,...},系列2：[fld1:,fld2:,...]}},{ }]
	 * @param {object} standard 雷达图各极坐标的标准值（参考值）{fld1:value,fld2: ,....}
	 */
	addRadar:function(radarArr,standard,chartOption){
		this.radarArr = radarArr;
		this.standard = standard;
		var  _option = chartOption || this.getOption();
		_option = this._getRadarOption(_option);
		var isloadRadar=this.radarScript; 
		var theme=this;
		if(!isloadRadar){
			require([  //引入依赖模块
        	'echarts/chart/radar'
        	 ],
        	function (ec,radar) {  
        		theme.radarScript=true;  
        		theme.setOption(_option,true);   
           }
       	);
		}else{
			theme.setOption(_option,true);
		} 
	},
	/**
	 * 独立值图
	 * @param {Object} data   数据 [{name:'上海','fld1':100,alias:'一级'，..},{}]
	 * @param {String} keyfld 制作独立值图的字段 fld1
	 * @param { string} geoFld 指定地理字段 name
	 * otherOption {color:,chartOption:,aliasFld:}
	 */
	addUnique: function (data,keyFld,geoFld,otherOption){ 
		var splitList = [];   //按值分类
		var u_series = {};    //独立值系列的series数据
		var seriesData = [];
		var allValues = [];   //指定的指标字段的所有值
		var aliasFld = keyFld, color, chartOption;
		if(otherOption){
			aliasFld = otherOption.aliasFld || keyFld;
			color = otherOption.color || undefined;
			chartOption = otherOption.chartOption ? _clone(otherOption.chartOption) : undefined;
		}
		// if(arguments.length ==4 ){
		// 	color = arguments[3] instanceof Array ? arguments[3] : undefined;
		// 	chartOption = !(arguments[3] instanceof Array) && typeof arguments[3] =='object' ? arguments[3]: undefined;
			
		// }else if(arguments.length ==5){
		// 	corlor = arguments[3] instanceof Array ? arguments[3] : undefined;
		// 	chartOption =  arguments[4];
		// }
		var _option = chartOption || this.getOption() || {};
		var _series = _option.series;
		if(_series!=undefined){
			var maptype = _series[0].mapType; 
			u_series.type = 'map';
			u_series.mapType = maptype;
		}else{
			alert('未指定地图,请在series参数中指定地图');
			return;
		}
		//针对字符串类型的字段，制作独立值图
		var mappingValue = {},count=0;
		for(var i=0,l=data.length;i<l;i++){
			var rec = data[i];
			var name = rec[geoFld];
			var value= rec[keyFld];
			var alias = rec[aliasFld]; 
			if(!(value instanceof Array) && value-parseFloat(value)+1 >=0 ){
				value = parseFloat(value);
				seriesData.push({name:name,value:value});
				allValues.push({value:value,label:alias});
			}else{
				if(mappingValue[value]){ //将不同字符串映射成数字
					count = mappingValue[value];
				}else{
					count++;
					mappingValue[value] = count;
					allValues.push({value:count,label:alias});
				}
				seriesData.push({name:name,value:count});
				// allValues.push({value:count,label:alias});

			}
		}
		u_series.data = seriesData;

		_sortArray(allValues,false); //逆序排序
		for(var j=0,ll=allValues.length;j<ll;j++){
			var obj = {start:allValues[j].value, end:allValues[j].value,label:allValues[j].label}; //,label:allValues[j]
			splitList.push(obj);
		}

		_option.dataRange.splitList = splitList;
		_option.dataRange.calculable = false;   
		_option.legend.data = []; //[keyFld];             //图例
		if(color) _option.dataRange.color = color;
		_option.series = [u_series];   //_option.series.concat(u_series); 
		console.log('独立值图option',_option);
		this.setOption(_option,true);
	},
	/**
	 * 等级符号图
	 * @param {[type]} data   Array [{name:'',value:''}]
	 * @param {[type]} params Object {geoCoord:,symbol:,color:,minSize:,maxSize:}
	 */
	addLevelSymbol: function(data,params,chartOption){
		var _option = chartOption ? _clone(chartOption) : this.getOption();
		var symbol='circle',color='red',minSize=10,maxSize=100,geoCoord;
		if(params){
			symbol = params.symbol || 'circle';
			color = params.color  || 'red';
			minSize = params.minSize || 10;
			maxSize = params.maxSize || 100;
			geoCoord = params.geoCoord;
		}
		var initCoord = false;
		if(!geoCoord){  
			initCoord = true;
			geoCoord  ={};
		}
		var valueArr = [];
		var name2center=this.getName2center();
		for(var i=0,l=data.length;i<l;i++){
			var value = data[i].value;
			if(value-parseFloat(value)+1>=0){
				valueArr.push(value);
			}else{
				data[i].value = 0;
			}	
			if(initCoord){//未指定geocoord，根据name属性解析
				var name = data[i].name;
				var cp =  name2center[name];  
				if(typeof cp=='undefined' || !(cp instanceof Array)){ continue;}
				if(name =='崇明县') { 
					cp =["20546.4", "45899.3"];
				}
				geoCoord[name] = [parseFloat(cp[0]),parseFloat(cp[1])];
			} 
		}
		_sortArray(valueArr);
		var startValue = valueArr[0]
		var endValue = valueArr[valueArr.length-1];
		var markPoint = {
                itemStyle : {
                    normal:{ color:color}
                },
                symbol:symbol,   //icon中定义了图标的类型
                symbolSize: function (value){ 
                     var size = _calculateByScale(startValue,endValue,value,minSize,maxSize);
                     return size;
                },
                data :data
            }
		var symbolSeries={
			//name: '',
            type: 'map',
            mapType: this.getMaptype(),
            hoverable: false,
            roam:true,
            data : [],
            markPoint:markPoint,
		};
		symbolSeries.geoCoord=geoCoord;
		_option.series = _option.series.concat(symbolSeries);
		if(_option.dataRange) delete _option.dataRange;
		this.setOption(_option,true);
	},
	/**
	 * 地图标注图
	 * @param {Array} data       Array [{name:'',value:''}]
	 * @param {Object} params     {geoCoord:,symbol:,color:[]}
	 * @param {[type]} chartOption [description]   color: ['maroon','purple','red','orange','yellow','lightgreen']
	 */
	addMarks: function(data,params,chartOption){
		var _option = chartOption ? _clone(chartOption) : this.getOption();
		var symbol,color,minSize=10,maxSize=100,geoCoord;
		if(params){
			symbol = params.symbol ;
			color = params.color  ;
			geoCoord = params.geoCoord;
		}
		var initCoord = false;
		if(!geoCoord){  
			initCoord = true;
			geoCoord  ={};
		}
		var valueArr = [];
		var name2center=this.getName2center();
		for(var i=0,l=data.length;i<l;i++){
			var value = data[i].value;
			if(value-parseFloat(value)+1>=0){
				valueArr.push(value);
			}else{
				data[i].value = 0;
			}	
			if(initCoord){//未指定geocoord，根据name属性解析
				var name = data[i].name;
				var cp =  name2center[name];  
				if(typeof cp=='undefined' || !(cp instanceof Array)){ continue;}
				if(name =='崇明县') { 
					cp =["20546.4", "45899.3"];
				}
				geoCoord[name] = [parseFloat(cp[0]),parseFloat(cp[1])];
			} 
		}
		
		var markPoint = {
                itemStyle : {
                     normal: {
                        borderColor: '#87cefa',
                        borderWidth: 1,            // 标注边线线宽，单位px，默认为1
                        label: {
                            show: false
                        }
                    },
                    emphasis: {
                        borderColor: '#1e90ff',
                        borderWidth: 5,
                        label: {
                            show: false
                        }
                    }
                },
              //  symbol:'emptyCircle',
                // symbolSize : function (v){
                //     return 10 + v/100
                // },
                effect : {
                    show: false,
                    shadowBlur : 0
                },
                symbol:symbol,   //icon中定义了图标的类型
                symbolSize: 6,
                data :data
            }
           if(symbol) markPoint.symbol = symbol;
		var symbolSeries={
			//name: '',
            type: 'map',
            mapType: this.getMaptype(),
            hoverable: false,
            roam:true,
            data : [],
            markPoint:markPoint,
		};
		symbolSeries.geoCoord=geoCoord;
		var dataRange_max= this.getDataRangeMax(data,['value']);
		_option.series = _option.series.concat(symbolSeries);
		if(color) _option.dataRange.color = color;
		_option.dataRange.max = dataRange_max;
		this.setOption(_option,true);
	},






	//清除地图上的饼图、漏斗图等
	clearChart:function (){
		if(this.eChart._hasPie){
			this.clearPies();
		}
		if(this.eChart._hasFunnel){
			this.clearFunnels();
		}
	},
	clearPies:function (){
		var pieLgend=this.legend.pie;
		var mapoption=this.getOption();
		var series=mapoption.series; 
		var newSeries=[];
		var mapLegend=mapoption.legend ? mapoption.legend.data :[];
		this.eChart._hasPie=false;
		this.eChart.pieData=[];
		for(var i=0;i<series.length;i++){   
			var pieFlag=series[i].seriesType;
			if(pieFlag!='pie_series'){
				newSeries.push(series[i]);
			}
		} 
		for(var ii=0;ii<pieLgend.length;ii++){
			for(var j=0;j<mapLegend.length;j++){
				if(mapLegend[j]==pieLgend[ii]){
					mapLegend.splice(j,1);
				}
			}
		} 
		
		mapoption.series=newSeries;
		if(mapoption.legend){
			mapoption.legend.data=mapLegend;
		}
		this.legend.pie=[];
		this.setOption(mapoption,true);  
	},
	clearFunnels:function (){
		var funnelLgend=this.legend.funnel;
		var mapoption=this.getOption();
		var series=mapoption.series; 
		var newSeries=[];
		this.eChart._hasFunnel=false;
		this.eChart.funnelData=[];
		var mapLegend=mapoption.legend ? mapoption.legend.data :[];
		for(var i=0;i<series.length;i++){   
			var Flag=series[i].seriesType;
			if(Flag!='funnel_series'){
				newSeries.push(series[i]);
			}
		}
		for(var ii=0;ii<funnelLgend.length;ii++){
			for(var j=0;j<mapLegend.length;j++){
				if(mapLegend[j]==funnelLgend[ii]){
					mapLegend.splice(j,1);
				}
			}
		} 
		mapoption.series=newSeries;
		if(mapoption.legend){
			mapoption.legend.data=mapLegend;
		}
		this.legend.funnel=[];
		this.setOption(mapoption,true);  
	},
	getName2center:function (){
		var maptype=this.getMaptype();
		var name2center={};
		//console.log(theme.eChart.chart.map._mapDataMap[maptype].transform);
		console.log('pathArray',theme.eChart.chart.map._mapDataMap[maptype].pathArray);
		var pathArr=this.eChart.chart.map._mapDataMap[maptype].pathArray; 
		for(var p=0,pathLen=pathArr.length;p<pathLen;p++){
			var field=ThemeMap.GeoField2name.geoField || 'name';
			var realname=pathArr[p].properties[field];
		 	// var cxy=pathArr[p].center;
			var cxy=pathArr[p].properties.cp;
			name2center[realname]=cxy;
		}  
		return name2center;
	},
	//地图漫游--刷新
	_getPieOption:function (newoption){  
		var theme=this;
		var _option=newoption;
		if(!theme.eChart._hasPie){ return _option; }
		var pieArr=theme.eChart.pieData;  
		var pieSeries_all=[]; 
		var pieLgend=[];   //_option.legend ? _option.legend.data || [] : []; 
		if(pieArr.length<1){   return _option;}
		var isshowLgend=pieArr[0].showLegend || false; 
		var maptype=theme.getMaptype();
		var name2center=this.getName2center();  
		if(maptype=='nomap'){ return;}
		// var minSize = pieArr[0].minSize;
		// var maxSize = pieArr[1].maxSize;
		var r = pieArr[0].radius;
		//this.radarRadius = this.radarRadius ? this.radarRadius :r; 
		var initFlag = true;
		if(this.pieRadius &&  this.pieRadius.length>0){
			initFlag = false;
		}else{
			this.pieRadius = [];
		}

		for(var i=0,len=pieArr.length;i<len;i++){
			var pieOptions=pieArr[i];
			var seriesName=pieOptions.name || '饼图';
			var _roseType=pieOptions.roseType ? pieOptions.roseType : '' ;
			var wxy=pieOptions.center; 
			if(!(wxy instanceof Array)){
				var centerXY=name2center[wxy];
				//待删除
				if(wxy=='崇明县') { console.log(centerXY);centerXY = [parseFloat(centerXY[0])-60000,parseFloat(centerXY[1])+20000];}
				
				if(centerXY){
					wxy=centerXY;
				}else{
					continue;
				}
			}
			
			var screenXY=theme.getPosByGeo(maptype,[parseFloat(wxy[0]),parseFloat(wxy[1])]); 
			var data=pieOptions.data;
			var otherStyles=pieOptions.optionalStyle;
			var dataArr=[];
			var radius=pieOptions.radius;  
			var _pieRadius = radius;



			for(var key in data){
			  	if(_indexOfInArray(key,pieLgend)<0){
			  		if(isshowLgend) pieLgend.push(key);
			  	}
				var obj={name:key,value:data[key]};
				dataArr.push(obj);
			}

			var radius = pieOptions.radius || [40];
			//var r = this.radarRadius || 40;
			if(initFlag){
				this.pieRadius.push(radius);
			}else{
				 radius =  this.pieRadius[i] || [40];
			}
			if(radius.length==1){
				_pieRadius=radius[0]; console.log('_pieRadius',_pieRadius);
			}else if(radius.length>1){
				_pieRadius=[radius[0],radius[1]];
			}
			// this.pieRadius = this.pieRadius ? this.pieRadius :_pieRadius; 
			 //_pieRadius = this.pieRadius ;
			
			var _pieSeries={
				name:seriesName,
				type:'pie',
				roseType:_roseType,
				tooltip:{
        			trigger: 'item',
        			formatter: "{a} <br/>{b} : {c} ({d}%)"
    			},
        		center:[screenXY[0],screenXY[1]],
        		radius: _pieRadius,
        		data:dataArr,
        		seriesType:'pie_series'
			};
			// _pieSeries['itemStyle']=otherStyles ? (otherStyles.itemStyle || {normal : {label : {show : false},labelLine : {show : false}}} ) : {normal : {label : {show : false},labelLine : {show : false}}};  //设置itemStyle的默认样式 
			_pieSeries['itemStyle']= otherStyles && otherStyles.itemStyle ? otherStyles.itemStyle : {normal : {label : {show : false},labelLine : {show : false}}};
			if(otherStyles!=undefined){
				for(var key in otherStyles){
					_pieSeries[key]=otherStyles[key];
				}
			}
			pieSeries_all.push(_pieSeries);
		} 
		_option.series=  _option.series.concat(pieSeries_all);  //pieSeries_all;
		this.legend.pie=pieLgend;
		var newLegend=[];
		 // newLegend=newLegend.concat(pieLgend,this.legend.funnel);
		// newLegend=newLegend.concat(pieLgend,this.getOption().legend.data); //与之前的合并
		newLegend=newLegend.concat(pieLgend);  //覆盖之前的所有图例
		if(isshowLgend){  
			_option.legend=_option.legend || {orient: 'vertical', x:'left'};
			_option.legend.data=newLegend;  
		} console.log('饼图_option',_option);
		return  _option; 
	},
	_getPieRadByScale: function (pieData){


	},

	_getRadarOption: function (chartOption){
		var _option = chartOption ? _clone(chartOption) : this.getOption();
		var polarArr = [];
		var radarSeries = [];
		var indicator = [];

		var radarArr = this.radarArr;
		var standard = this.standard;
		
		var maptype=this.getMaptype();
		var name2center=this.getName2center();  
		if(maptype=='nomap'){ return;} 
		var zhibiao = [];
		for(var key in standard){  //遍历各指标的标准 即最大值
			indicator.push({'text':key,'max':standard[key]}); 
			zhibiao.push(key);
		}
		var r = radarArr[0].radius;
		//this.radarRadius = this.radarRadius ? this.radarRadius :r; 
		var initFlag = true;
		if(this.radarRadius &&  this.radarRadius.length>0){
			initFlag = false;
		}else{
			this.radarRadius = [];
		}
		for(var i=0,l=radarArr.length;i<l;i++){
			var radarInfo = radarArr[i];
			var data = radarInfo.data;
			var r = radarInfo.radius || 40;
			//var r = this.radarRadius || 40;
			if(initFlag){
				this.radarRadius.push(r);
			}else{
				 r =  this.radarRadius[i] || 40;
			}
			var cp = radarInfo.center;   //地名的情况需要处理
			if(!(cp instanceof Array)){  //使用name地名 转换成坐标
				var centerXY=name2center[cp];
				cp = centerXY || [0,0];	
			}
			var screenXY=this.getPosByGeo(maptype,[parseFloat(cp[0]),parseFloat(cp[1])]); 
			polarArr.push({"indicator":indicator,"radius":r,"center":screenXY,zlevel: 4,splitArea:{areaStyle:{type:'default'}},splitLine:{show:true,lineStyle:{color:'green'}}});  //各雷达图的坐标信息
			 var curData = [];
			 var seriesNames = [];
			 for(var seriesName in data){
			 	seriesNames.push(seriesName);
			 	var serieData = data[seriesName];
			 	var value = [];
			 	//遍历指标的值
			 	for(var j=0,len=zhibiao.length;j<len;j++){
			 		var fld = zhibiao[j];
			 		value.push(serieData[fld]);   //value值和polar中的指标名称对应
			 	}
			 	curData.push({value:value,name:seriesName});
			 }
			
			 var curSeries = {
			 	//name:,
			 	type:'radar',
			 	polarIndex:i,
			 	tooltip : {trigger: 'axis'},
			 	data:curData,
			 	itemStyle: {
			 		normal: {
			 		areaStyle: {
                        type: 'default'
                   		 }
               		 }
            	},
            	seriesType:'radar_series'
       		 };
			 radarSeries.push(curSeries);   //各雷达对应的数据series
		}
		_option.polar = polarArr;
		_option.series = _option.series.concat(radarSeries);
		_option.legend = _option.legend ? _option.legend :{};
		_option.legend.data = seriesNames;
		return _option;

	},
	_getFunnelOption:function (newoption){
		var funnelData=this.eChart.funnelData;
		var maptype=this.getMaptype();
		var mapoption=newoption;  
		var isloadFunnel=this.funnelScript;
		var funnelSeries=[];
		var theme=this;
		var funnelLgend=[];
		var isshowLgend=funnelData[0].showLegend || false; 
		var name2center=this.getName2center();
		for(var i=0,len=funnelData.length;i<len;i++){
			var param=funnelData[i];
			var _name=param.name || '漏斗图';
			var size=param.size || {w:100,h:100};
			var wxy=param.position;
			// wxy= wxy instanceof Array ? wxy : ThemeMap.name2center[wxy];
			var data=param.data;
			var sort=param.sort || 'ascending';
			var optionalStyle=param.optionalStyle || {};
			var dataArr=[];
			var minValue=Number.POSITIVE_INFINITY;
			var maxValue=0;
			if(!(wxy instanceof Array)){  
				var centerXY=name2center[wxy];
				if(centerXY){
					wxy=centerXY;
				}else{
					continue;
				}
			}   
			var screenXY=this.getPosByGeo(maptype,[parseFloat(wxy[0]),parseFloat(wxy[1])]); 
			for(var key in data){
				if(_indexOfInArray(key,funnelLgend)<0){
			  		if(isshowLgend) funnelLgend.push(key);
			  	}
				var obj={name:key,value:data[key]};
				if(data[key]>maxValue){
				 	maxValue=data[key]; 
				  }
				  if(minValue>data[key]){
				  	minValue=data[key];
				  }
				dataArr.push(obj);
			}
			var curSeries={
				name:_name,
            	type:'funnel',
            	x:parseFloat(screenXY[0])-parseFloat(size.w)/2,
            	y:parseFloat(screenXY[1])-parseFloat(size.h)/2,
            	width: size.w || 40,
            	height:size.h || 60,
            	sort: sort,
            	data:dataArr,
            	min:minValue,
                max:maxValue,
                minSize:'0%',
                maxSize:'100%',
            	seriesType:'funnel_series'
			};
			if(!optionalStyle.itemStyle){
				optionalStyle.itemStyle={
					normal: {
                    label: { show: false},
                    labelLine: {show: false}
                },
                emphasis: {
                    label: {show: false,},
                    labelLine: {show: false}
                    }
				};
			}
			for(var key in optionalStyle){
				curSeries[key]=optionalStyle[key];
			}
			funnelSeries.push(curSeries);
		}
		this.legend.funnel=funnelLgend;
		var newLegend=[];
		//newLegend=newLegend.concat(funnelLgend,this.legend.pie);
		newLegend=newLegend.concat(funnelLgend);  //覆盖之前的所有图例
		mapoption.series=mapoption.series.concat(funnelSeries);
		if(isshowLgend){  
			mapoption.legend=mapoption.legend || {orient: 'vertical', x:'left'};
			mapoption.legend.data=newLegend;
		}  
		return mapoption;
	},
	_getGaugeOption: function (newoption){
		var gaugeData=this.eChart.gaugeData;
		var maptype=this.getMaptype();
		var mapoption=newoption;  
		var isloadGauge=this.gaugeScript;
		var gaugeSeries=[];
		var theme=this;
		var gaugeLgend=[];
		var isshowLgend=gaugeData[0].showLegend || false; 
		var name2center=this.getName2center();
		for(var i=0,len=gaugeData.length;i<len;i++){
			var tmpSeries = {};
			var param = gaugeData[i];
			for(var key in param){
				tmpSeries[key] = param[key];
			}
			// var wxy = param.center;
			// var r = param.radius;
			// var min = param.min;
			// var max = param.max;
			// var splitNum = param.splitNumber;

			gaugeSeries.push(tmpSeries);
		}
		mapoption.series=mapoption.series.concat(gaugeSeries);
		return mapoption;
	},
	//根据选择的地图区域的数据，生成柱状图的series
	makeBarSerie:function (selected){
		var barSeries=[];
    	var mapSeries=this.getSeries();
    	var selectedName=[];  //地图上的地名  id/name
    	var nameMaping=ThemeMap.name2GeoField.nameMapping;
    	var selectedRealName=[];
    	for(var p in selected){
        if(selected[p]){
            selectedName.push(p); 
            if(!nameMaping[p]){
                selectedRealName.push(p); 
            }else{
                selectedRealName.push(nameMaping[p]); 
            }
        	}
    	}  
    	for(var i=0,len=mapSeries.length;i<len;i++){
        	var curSeries=mapSeries[i];
        	var type=curSeries.type;
        	var seriesName=curSeries.name;
        	var seriesData=[];
        	if(type=='map'){ //利用专题图上的数据
            var data=curSeries.data;
            for(var k=0,selectLen=selectedName.length;k<selectLen;k++){
                var selname=selectedName[k];
                for(var j=0,dataLen=data.length;j<dataLen;j++){
                    if(data[j].name==selname){
                        seriesData.push(data[j].value);
                    }                
                }
            }            
        }
        var obj= {name:seriesName,type:'bar',data:seriesData};
        barSeries.push(obj);
      }
      return barSeries;
	},
	//根据选择的地图区域，生成饼图的series
	makePieSerie:function (selected){
	
	},
	//请求表中的数据{url:,port:,db:,table:,fields:[],filter:}
	queryData:function (params,callback){  
		// var websqlUrl="http://"+ThemeMap.requrl+":"+ThemeMap.port+"/WebSQL";
		var websqlUrl=ThemeMap.requrl+"/WebSQL";
		var dbname=params.db;
		var tabname=params.table;
		var fieldArr=params.fields;
		var fldStr=params.fields.join(',');
		var filter=params.filter;
		var sql='select '+fldStr+" from "+tabname;
		ThemeMap.ajaxType='SQLDATA';
		if(filter!=undefined && filter!=''){
			sql=sql+" where "+filter;
		}
		var qryParams={
            	"mt":"SQLQuery",
                "GeoDB":dbname,
                "SQL":sql
            }
        var datastr = JSON.stringify(qryParams);
        var para = {
            req: datastr
          };
        _ajax("POST", websqlUrl, para, true, function(data){ 
          	var jsonparase;
            var jsonparase_tmp=data;
            var returnfields=jsonparase_tmp.data;  
            var returnfields_len=returnfields.length;
            var allFieldsArr=jsonparase_tmp.fldsDef;
            var allFlds=[];
            var returnArrays=[];
            //取出所有字段的名称
            for(var ii=0;ii<allFieldsArr.length;ii++){
                var fldname=allFieldsArr[ii].name;
                allFlds.push(fldname);
            }  
            for(var nn=0;nn<returnfields_len;nn++){
                var tmprecords=returnfields[nn];//此时是一个数组     
                if(fldStr!='*'){ //如果不是查询所有字段，进行字段数判断
                var returnFields_len=tmprecords.length;
                if(returnFields_len!=fieldArr.length){
                    alert('查询字段与返回字段个数不统一，问题：存在数据库中不存在字段！');
                    return;
                }
                var recordjson={}; 
                for(var tt=0;tt<returnFields_len;tt++){
                    var fieldname=fieldArr[tt];
                    var fieldvalue=tmprecords[tt];
                    recordjson[fieldname]=fieldvalue; 
                }
                   returnArrays.push(recordjson);   
                }else{   //返回所有字段
                   var recordjson={};
                   var returnFields_len=tmprecords.length;
                   for(var tt=0;tt<returnFields_len;tt++){
                       var fieldname=allFlds[tt]; 
                       var fieldvalue=tmprecords[tt];  
                       recordjson[fieldname]=fieldvalue; 
                   }
                   returnArrays.push(recordjson);
                        } 
                 }
                  
              jsonparase=returnArrays;  
              callback(jsonparase,allFlds);

          },function() {
                alert('websql请求超时');
            },500000);
	}

 };

/**
 * Ajax请求
 *otherParams主要为了给callback函数
 */
function _ajax(method, url, data, async, callback,timoutFunc,timeout,otherParams) {
	var timer_out;//设置超时id
	var parames_len=arguments.length;
	if(arguments.length==7||arguments.length==8){
		//创建计时器
		timer_out=setTimeout(function(){
			if (xdr){  
                xdr.abort(); 
            }else if(xhr){
            	//alert(typeof xhr);
            	
            	xhr.abort(); 
            }
			timoutFunc();
		},timeout);  
	}
	var xhr = null;
	var xdr = null;
	if (data instanceof Object) {  
		var str = "";
		for (k in data) { 
			str += k + "=" + encodeURIComponent(data[k]) + "&";
			//str += k + "=" + escape(data[k]) + "&";
		}
		data = str;   
	}
	if (window.XDomainRequest) {
		xdr = new XDomainRequest();
		if (xdr) {
			xdr.onerror = showerr;
			xdr.onload = function () {
				if (timer_out){  
                   clearTimeout(timer_out);  
                }
                if(arguments.length==8){
                    var json=JSON.parse(xhr.responseText);
                    callback(_decode(json),otherParams);
                }else{
                	var json=JSON.parse(xhr.responseText);
                    callback(_decode(json));
                	
                }
				
			};
			if ("get" == method.toLowerCase()) {
				if (data == null || data == "") {
					xdr.open("get", url);
				} else {
					xdr.open("get", url + "?" + data);
				}
				xdr.send();
			} else if ("post" == method.toLowerCase()) {
				xdr.open("post", url);
				xdr.setRequestHeader("content-Type", "application/x-www-form-urlencoded");
				xdr.send(data);
			}
		}
	} else {
		if (window.XMLHttpRequest) {
			xhr = new XMLHttpRequest();
		} else if (window.ActiveXObject) {
			xhr = new ActiveXObject("Microsoft.XMLHTTP");
		}

		xhr.onreadystatechange = function (e) {
			if (4 == xhr.readyState) {
				if (200 == xhr.status) {
					if (callback) {
						if (timer_out){
                           clearTimeout(timer_out);  
                        }
                        if(parames_len==8){ 
                        	var json=JSON.parse(xhr.responseText);
                            callback(_decode(json),otherParams);
                        }else{
                        	var json=JSON.parse(xhr.responseText); console.log('json',json);
                        	switch (ThemeMap.ajaxType){
                        		case "SQLDATA":
                        		callback(json);
                        		break;
                        		case "GeoJson":
                        		callback(_decode(json));
                        		break;
                        	}
                        }
					}
				} else if (404 == xhr.status) {
					if (hander404) {
						hander404();
					}
				} else if (500 == xhr.status) {
					if (hander500) {
						hander500();
					}
				}
			}
		}
		if ("get" == method.toLowerCase()) {
			if (data == null || data == "") {
				xhr.open("get", url, async);
			} else {
				xhr.open("get", url + "?" + data, async);
			}
			xhr.send(null);
		} else if ("post" == method.toLowerCase()) {
			xhr.open("post", url, async);
			xhr.setRequestHeader("content-Type", "application/x-www-form-urlencoded");
			xhr.send(data);
		}
	}
	function handler404() {
		alert("ReqUrl：not found");
	}
	function handler500() {
		alert("服务器错误，请稍后再试");
	}
	function showerr(e){
	}
}
//解码
/*编码规则：1、坐标整形化，将浮点型的坐标乘以一个scale值，经纬度的scale值取100000，上海坐标的
scale值取2,  2、将要素的第一个坐标（整形化后的）设为encodeOffsets,第一个坐标存储为0，
后面每个坐标存储为与前面坐标的差值   据此进行解码*/

function _decode(json){ 
	ThemeMap.map_geoNames=[];
	ThemeMap.name2GeoField.nameMapping={};
	ThemeMap.GeoField2name.geoMapping={};
    var scale=json.scale;    
    if(!json.UTF8Encoding) {  
        var features = json.features;  
        for (var f = 0; f < features.length; f++) {
            var feature = features[f];
            var coordinates = feature.geometry.coordinates;
            var encodeOffsets = feature.geometry.encodeOffsets[0];
            var mappingValue=feature.properties.name;  //地图上的标示地名  可能是一个id号
            var cp=feature.properties.cp;
           // feature.properties.cp = _shToLngLat(cp[0],cp[1]);

            var _name=feature.properties[ThemeMap.GeoField2name.geoField]; //实际的地名
            feature.properties.name = _name;  //2016-1-4 将name指向实际的地名 
            var _name=feature.properties[ThemeMap.GeoField2name.geoField]; //实际的地名
             ThemeMap.GeoField2name.geoMapping[_name]=mappingValue;
             ThemeMap.name2GeoField.nameMapping[mappingValue]=_name;
          
            ThemeMap.map_geoNames.push(mappingValue); 
            //针对一个要素有多部分组成的 即multiPolyline的情况
            var parts=feature.geometry.Parts || [0];
            feature.geometry.coordinates=_decodePolygon(parts,coordinates,encodeOffsets,scale);  
        } 
      }
      //console.log('解码后',JSON.stringify(json));
      var themeSucc=ThemeMap.themeSucceed;
      if(themeSucc){ 
      	themeSucc();
      	ThemeMap.themeSucceed=null;
      }
      return json;
}
function _decodePolygon(parts,coordinate,encodeOffsets,scale){ 
    var coord=[];
    var startX = parseFloat(encodeOffsets[0]);
    var startY = parseFloat(encodeOffsets[1]);  
    var partLen=parts.length;
    var prevPt=[];  //保存前一个点（解码后的坐标值）
    for(var partNum=0;partNum<partLen;partNum++){
        var ptarr=[]; 
        var startIndex=parts[partNum];  //起始节点的位置
        if(partNum==partLen-1){
            var endIndex=(coordinate.length)/2;  //结束点的位置
        }else{
           var endIndex=parts[partNum+1]; 
        }  
        for(var i=startIndex*2;i<endIndex*2;i=i+2){
            var dltx=parseFloat(coordinate[i]);
            var dlty=parseFloat(coordinate[i+1]);  
            if(i==0){ 
                var x=parseFloat(startX/scale);
                var y=parseFloat(startY/scale);
                var pt=[ Number(x.toFixed(4)), Number(y.toFixed(4))];
                ptarr.push(pt); 
                prevPt=pt;
            }else{ 
                var prevXY=prevPt;   //prevPtArr[prevPtArr.length-1];
                var x=(parseFloat(prevXY[0])+parseFloat(dltx/scale)); 
                var y=(parseFloat(prevXY[1])+parseFloat(dlty/scale));
                var pt=[ Number(x.toFixed(4)), Number(y.toFixed(4))];
                prevPt=pt;
                ptarr.push(pt);
            } 
        }
        coord.push(ptarr);  
    }
    return coord;
}


function _decode_old(json){ 
	ThemeMap.map_geoNames=[];
	//ThemeMap.name2center=[];
	var scale=json.scale;    
	ThemeMap.name2GeoField.nameMapping={};
	ThemeMap.GeoField2name.geoMapping={};
	if(!json.UTF8Encoding) {  
		var features = json.features; 
		for (var f = 0; f < features.length; f++) {
            var feature = features[f];
            var coordinates = feature.geometry.coordinates;
            var encodeOffsets = feature.geometry.encodeOffsets[0];
            var mappingValue=feature.properties.name;  //地图上的标示地名  可能是一个id号
            var cp=feature.properties.cp;
           // feature.properties.cp = _shToLngLat(cp[0],cp[1]);

            var _name=feature.properties[ThemeMap.GeoField2name.geoField]; //实际的地名
            feature.properties.name = _name;  //2016-1-4 将name指向实际的地名 
            // ThemeMap.name2center[_name]=cp;  
            // if(ThemeMap.GeoField2name.geoField!='name'){  
            	var _name=feature.properties[ThemeMap.GeoField2name.geoField]; //实际的地名
                ThemeMap.GeoField2name.geoMapping[_name]=mappingValue;
                ThemeMap.name2GeoField.nameMapping[mappingValue]=_name;
            //}  
            ThemeMap.map_geoNames.push(mappingValue);
            if (feature.geometry.type == 'Polygon') { 
             	   feature.geometry.coordinates=_decodePolygon(coordinates,encodeOffsets,scale);  
			}  
        } 
      }

      var themeSucc=ThemeMap.themeSucceed;
      if(themeSucc){ 
      	themeSucc();
      	ThemeMap.themeSucceed=null;
      }
      //console.log('解码后',JSON.stringify(json));
      return json;
}
function _decodePolygon_old(coordinate,encodeOffsets,scale){ 
	var coord=[];
	var ptarr=[]; 
    var startX = parseFloat(encodeOffsets[0]);
    var startY = parseFloat(encodeOffsets[1]);  
    for(var i=0,len=coordinate.length;i<len-1;i=i+2){ 
    	var dltx=parseFloat(coordinate[i]);
    	var dlty=parseFloat(coordinate[i+1]);  
    	if(i==0){
    		var x=parseFloat(startX/scale);
    		var y=parseFloat(startY/scale);
    		var pt=[new Number(x.toFixed(4)),new Number(y.toFixed(4))];
    		
    		ptarr.push(pt);
    	}else{ 
    		var prevXY=ptarr[ptarr.length-1]; 
 
    		var x=(parseFloat(prevXY[0])+parseFloat(dltx/scale)); 
    		var y=(parseFloat(prevXY[1])+parseFloat(dlty/scale));
    		var pt=[new Number(x.toFixed(4)),new Number(y.toFixed(4))];
    		
    		ptarr.push(pt);
    	}	
    }
    coord.push(ptarr);  
    return coord;
}
//点抽稀 :垂距法
function verDis(ptArr,limitDis){
	var sPt = [];
	var ePt = [];
	var mPt = [];
	var arr = [];
	for(var i=0,l=ptArr.length;i<l;i++){
		if(i == 0){
			sPt = ptArr[0];
			ePt = ptArr[2];
			mPt = ptArr[1];
			//arr[0] = ptArr[0];
		}


		var dis = getDis(mPt,sPt,ePt);
		if(dis < limitDis){  //舍弃中间点
			arr.push(sPt);
			sPt = ePt;
		}

	}

}
//计算midPt到pt1,pt2连线的距离
function getDis(midPt,pt1,pt2){
	var x0 = midPt[0];
	var y0 = midPt[1];
	var x1 = pt1[0];
	var y1 = pt1[1];
	var x2 = pt2[0];
	var y2 = pt2[1];
	var fenmu = Math.sqrt((y2-y1)*(y2-y1)+(x2-x1)*(x2-x1));
	var dis = (y2-y1)*x0-(x2-x1)*y0+(x2-x1)*y1-(y2-y1)*x1/fenmu;
	return dis;
}

/**
 * 计算目标值 按照线性变化后，在[min,max]中的哪个值
 * @param  {[type]} startV      [description]
 * @param  {[type]} endV        [description]
 * @param  {[type]} tragetValue [description]
 * @param  {[type]} min         [description]
 * @param  {[type]} max         [description]
 * @return {[type]}             [description]
 */
function _calculateByScale(startV,endV,tragetValue,min,max){
	var scale = (endV- startV)/(max-min);
	var x = min + (tragetValue - startV)/scale;
	return x;
}



 /**
 * 上海市坐标转经纬度
 * @param x
 * @param y
 * @returns {{lat: number, lng: number}}
 */
function _shToLngLat(x, y) {
	var A = 95418.0172735741;
	var B = 48.3052839794785;
	var C = -11592069.1853624;
	var D = 63.9932503167748;
	var E = 110821.847990882;
	var F = -3469087.15690168;
	var lat = parseFloat((D * x - A * y - (C * D - A * F)) / (B * D - A * E));
	var lng = parseFloat((E * x - B * y - (C * E - B * F)) / (A * E - B * D));
	lat = parseFloat(lat.toFixed(4));
	lng = parseFloat(lng.toFixed(4));
	return [lng,lat];
}
 /**
 * 获取元素在数组中的位置
 * @param ele  数组元素  也可可能是对象 obj
 * @param arr  目标数组
 * @returns index  
 */
function _indexOfInArray(ele,arr){
	for(var i=0,len=arr.length;i<len;i++){
		if(_equalObject(ele,arr[i])){
			return i;
		}
	}
	return -1;
}
/**
* 对象比较
* @param obj1
* @param obj2
* @return bool
*/
 function _equalObject(obj1, obj2){
    if(typeof obj1 != typeof obj2)return false;
    if(obj1 == null || obj2 == null)return obj1 == obj2;
    if(typeof obj1 == 'object'){
    for (var key in obj1){
    if(typeof obj2[key] == 'undefined') return false;
    if(!_equalObject(obj1[key],obj2[key])) return false;
   }
   return true;
   }else{
   return obj1 == obj2;
  }
}
// return {
// 	addMap: _extendMapData, //扩展地图数据
// 	Theme: Theme,           //专题图
// 	setReqURL: _setRequrl, //设置请求专题图的url
// 	requrl: 
// 	port: 
// 	ajaxType:;            //GeoJson(编码的数据，需要解码后传给回调函数)、SQLDATA（sql查询）、ZIPGeoJson（需解压、解码）
// 	name2GeoField:        //name与指定字段的对应关系
// }

//数组排序
function _sortArray(arr,asc){
	asc = typeof asc =='undefined' ? true :asc;
	arr.sort(function (x,y){
		if(x>y){
			if(asc){
				return 1;
			}else{
				return -1;
			}
			
		}else{
			if(asc){
				return -1;
			}else{
				return 1;
			}
			
		}
	});
}
//克隆对象
function _clone(obj){
	var result ;
	if(obj){
		if(obj instanceof Array){
			result = [];
			for(var i=0,l=obj.length;i<l;i++){
				result[i] = typeof obj[i] =='object' ? _clone(obj[i]) :obj[i];
			}
		}else if(typeof obj=='object'){
			result = {};
			for(var key in obj){
				result[key] = typeof obj[key] =='object' ? _clone(obj[key]) : obj[key];
			}
		}else{
			result = obj;
		}
		return result;
	}
	return null;
}

})();










