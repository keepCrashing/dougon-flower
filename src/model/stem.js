import MagneticCurve from './MagneticCurve';
import { BezierSpline } from './Spline';
import shortid from 'shortid';
import nextType from './MarkovLeaf';
import * as Drawer from './Drawer';
import _ from 'lodash';
import SVG from 'svg.js';
import * as UI from './UIManagement';
import * as Matrix from './Matrix';

import {LeafImage,leafColliders} from '../images/LeafImage';
const transformParameters = [];

const normalizedColliders = prepareCollider();
function prepareCollider() {
	const parser = new DOMParser();
	const parsedLeafs = LeafImage.map(s=>parser.parseFromString(s, 'image/svg+xml'));
	return parsedLeafs.map(normalizeSVG);
}
function normalizeSVG(leafSVG, index) {
	const direct = leafSVG.getElementById('direct');
	const direct_x1 = Number(direct.getAttribute('x1'));
	const direct_y1 = Number(direct.getAttribute('y1'));
	const direct_x2 = Number(direct.getAttribute('x2'));
	const direct_y2 = Number(direct.getAttribute('y2'));

	const directLength = Matrix.distance(direct_x1, direct_y1, direct_x2, direct_y2);

	const toDeg = 180/Math.PI;

	const redLineAngle = Math.atan2( direct_y2 - direct_y1, direct_x2-direct_x1 )* toDeg;

	transformParameters.push({direct_x1, direct_y1, directLength, redLineAngle});
	//scale(1 ${-sign}) == matrix(1 0 0 ${-sign} 0 0) 
	let matrix = new SVG.Matrix()
		.rotate(-redLineAngle) 
		.scale(1/directLength)
		.translate(-direct_x1,-direct_y1);

	const _colliders = leafColliders[index].map(([x,y])=> Matrix.multiplyMatrixAndPoint(matrix, [x,y,1]).slice(0,2));
	return _colliders;
}


export class Floral{
	constructor(basePath, r,trunkHead,trunkTail,flowerType='海石榴華', aspect = '正面',flowerRotation=30){
		this.id = shortid.generate();
		this.curve = (aspect === '正面') ?basePath:basePath.range(0, 0.7);
		this.flowerType = flowerType;
		this.flowerRotation = flowerRotation;
		this.colliders = undefined;
		let point = _.last(this.curve.controlPoints)[3];
		this.flowerPosition = {
			x: point[0],
			y: point[1],
			r
		};
		this.trunkHead = trunkHead;
		this.trunkTail = trunkTail;
		this.aspect = aspect;
	}
	burgeons(amount){
		if (this.curve.length === 0) return;
		let samples = this.curve.sample(amount);

		let type = 0;

		return samples.map(s => {
			const {point, direction} = s;
			return (new Burgeon(point.x, point.y, direction, type, this) );
		});
	}
	draw(){
		Drawer.drawStem(this);
		Drawer.drawFlower(this);
		Drawer.drawBasePath(this.curve.svgString());
	}
}

export class Burgeon{
	constructor(x,y,direction,type,parent){
		this.x=x;
		this.y=y;
		this.direction = direction;
		this.parent = parent;
		this.type = type;
	}

	germinate( length,alpha,sign){
		let mag = new MagneticCurve({
			startX:this.x, 
			startY:this.y, 
			vx:this.direction.x,
			vy: this.direction.y,
			T: length,
			alpha,
			sign
		});
		this.mag = mag;

		return Leaf.makeLeafByPoint(mag.getCurve(), sign, this.type);
	}
}

export class Leaf {
	static makeLeafByPoint(points, sign, type){
		const lastOne = points.length - 1;
		let startX = points[0][0];
		let startY = points[0][1];
		let endX = points[lastOne][0];
		let endY = points[lastOne][1];

		return new Leaf(startX,startY,
			endX,endY,
			BezierSpline.makeByPoints(points),
			sign,
			type
		);
	}

	constructor(startX,startY,endX,endY,curve, sign,type) {
		this.startX = startX;
		this.startY = startY;
		this.endX = endX;
		this.endY = endY;
		this.type = type;
		this.curve = curve;
		this.sign = sign;
	}
	burgeons(amount){
		let samples = this.curve.sample(amount);
		return samples.map(s => {
			const {point, direction} = s;
			return (new Burgeon(point.x, point.y, direction, nextType(this.type), this) );
		});
	}
	computeColliders(density=1){
		const skeletonLength = Matrix.distance(this.startX, this.startY, this.endX, this.endY);
		const leafCurveAngle = Math.atan2( this.endY - this.startY, this.endX - this.startX);
		
		this._colliders = normalizedColliders[this.type].map(p=> {
			p = Matrix.scale(p , 1, -this.sign);
			p = Matrix.rotate(p, leafCurveAngle);
			p = Matrix.scale(p, skeletonLength, skeletonLength);
			p = Matrix.scale(p, 1/density, 1/density);
			p = Matrix.translate(p, this.startX, this.startY);
			return p;
		});
		return this._colliders;
	}
	transformString(){
		const skeletonLength = Matrix.distance(this.startX, this.startY, this.endX, this.endY);
		const leafCurveAngle = Math.atan2( this.endY - this.startY, this.endX - this.startX);
		const toDeg = 180/Math.PI;

		let {direct_x1, direct_y1, directLength, redLineAngle} = transformParameters[this.type];

		return `
			translate(${this.startX} ${this.startY}) 
			scale(${skeletonLength}) 
			rotate(${leafCurveAngle*toDeg})
			${this.sign ? '': 'scale(1 -1)'}
			rotate(${-redLineAngle}) 
			scale(${1/directLength}) 
			translate(${-direct_x1},${-direct_y1})`
			.replace(/\n/gm,' ');
	}
	get colliders(){
		if(this._colliders) return this._colliders;
		this._colliders = this.computeColliders(UI.state.density);
		return this._colliders;
	}
}