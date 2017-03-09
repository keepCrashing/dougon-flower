import * as dat from '../lib/dat.gui';
import download from '../lib/download';
import CurveManagement from './CurveManagement';

let gui, folders = [];
let controls = [];
export let state = {
	trunkHeadWidth: 5,
	trunkTailWidth: 30,
	intersect: false,
	levelCurve :[
		{
			length: 400,
			alpha: 0.8,
			branches: 5
		},
		{
			length: 200,
			alpha: 0.75,
			branches: 5
		},
		{
			length: 100,
			alpha: 0.7,
			branches: 5
		},
		{
			length: 50,
			alpha: 0.65,
			branches: 5
		}
	],
	bound:{
		x:0,
		y:0,
		w:0,
		h:0
	},
	tool:'bound'
};

let features = {
	download : function(){
		let svg = document.getElementsByTagName('svg')[0];
		download(svg.outerHTML, 'file.svg', 'text/plain');
	}
};

export function setGUI(){
	gui = new dat.GUI();
	let c0 = gui.add(state, 'tool', ['paint', 'bound', 'select']);
	let c1 = gui.add(state, 'trunkHeadWidth', 1, 20);
	let c2 = gui.add(state, 'trunkTailWidth', 20, 40);
	
	controls.push(c0);
	controls.push(c1);
	controls.push(c2);
	//gui.add(state, 'intersect');

	levelFolder(0);
	levelFolder(1);
	levelFolder(2);
	levelFolder(3);

	setOnChange(controls);

	gui.add(features, 'download');

}

function levelFolder(index){
	let folder = gui.addFolder(`Level ${index}`);
	controls.push( folder.add(state.levelCurve[index], 'length') );
	controls.push( folder.add(state.levelCurve[index], 'alpha') );
	controls.push( folder.add(state.levelCurve[index], 'branches').step(1) );
	folders.push(folder);
}

function setOnChange(controls){
	controls.forEach( c => {
		c.onChange( () => {
			if( CurveManagement.selectedCurve.length === 1 ){
				CurveManagement.selectedCurve[0].redraw();
			}
		});
	});
}