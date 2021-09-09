import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Icon, Label } from 'ts/component';
import { Util, C, Storage } from 'ts/lib';
import { commonStore } from 'ts/store';
import { observer } from 'mobx-react';

interface Props {}

const $ = require('jquery');

const Progress = observer(class Progress extends React.Component<Props, {}> {
	
	obj: any = null;
	dx: number = 0;
	dy: number = 0;
	width: number = 0;
	height: number = 0;

	constructor (props: any) {
		super(props);
		
		this.onCancel = this.onCancel.bind(this);
		this.onDragStart = this.onDragStart.bind(this);
	};
	
	render () {
		const { progress } = commonStore;
		const { status, current, total, isUnlocked, canCancel } = progress || {};

		if (!status) {
			return null;
		};
		
		const text = Util.sprintf(status, current, total);
		const cn = [ 'progress', (isUnlocked ? 'isUnlocked' : '') ];
		
		return (
			<div className={cn.join(' ')}>
				<div id="inner" className="inner" onMouseDown={this.onDragStart}>
					<Label text={text} />
					{canCancel ? <Icon className="close" onClick={this.onCancel} /> : ''}
					<div className="bar">
						<div className="fill" style={{width: (Math.ceil(current / total * 100)) + '%'}} />
					</div>
				</div>
			</div>
		);
	};

	componentDidMount () {
		$(window).unbind('resize.progress').on('resize.progress', () => { this.resize(); });
	};
	
	componentDidUpdate () {
		const { progress } = commonStore;
		if (!progress) {
			return;
		};

		const { current, total } = progress;
		const node = $(ReactDOM.findDOMNode(this));

		this.resize();
		
		node.removeClass('hide');
		
		if (total && (current >= total)) {
			node.addClass('hide');
			setTimeout(() => { commonStore.progressClear(); }, 200);
		};
	};

	componentWillUnmount () {
		$(window).unbind('resize.progress');
	};
	
	onCancel (e: any) {
		const { progress } = commonStore;
		const { id } = progress;
		
		C.ProcessCancel(id);
	};

	resize () {
		const node = $(ReactDOM.findDOMNode(this));
		const coords = Storage.get('progress');

		this.obj = node.find('#inner');
		this.height = this.obj.outerHeight();
		this.width = this.obj.outerWidth();

		if (coords) {
			const { x, y } = this.checkCoords(coords.x, coords.y);
			this.setStyle(this.obj, x, y);
		};
	};

	onDragStart (e: any) {
		const win = $(window);
		const offset = this.obj.offset();

		this.dx = e.pageX - offset.left;
		this.dy = e.pageY - offset.top;

		win.unbind('mousemove.progress mouseup.progress');
		win.on('mousemove.progress', (e: any) => { this.onDragMove(e); });
		win.on('mouseup.progress', (e: any) => { this.onDragEnd(e); });
	};

	onDragMove (e: any) {
		const win = $(window);
		const { x, y } = this.checkCoords(e.pageX - this.dx - win.scrollLeft(), e.pageY - this.dy - win.scrollTop());

		this.setStyle(this.obj, x, y);
		Storage.set('progress', { x, y });
	};

	onDragEnd (e: any) {
		$(window).unbind('mousemove.progress mouseup.progress');
	};

	checkCoords (x: number, y: number): { x: number, y: number } {
		const win = $(window);

		x = Number(x);
		x = Math.max(0, x);
		x = Math.min(win.width() - this.width, x);

		y = Number(y);
		y = Math.max(Util.sizeHeader(), y);
		y = Math.min(win.height() - this.height, y);

		return { x, y };
	};

	setStyle (obj: any, x: number, y: number) {
		obj.css({ margin: 0, left: x, top: y });
	};
	
});

export default Progress;