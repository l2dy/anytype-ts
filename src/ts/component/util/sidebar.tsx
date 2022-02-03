import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { I, C, DataUtil, Util, keyboard, Storage } from 'ts/lib';
import { IconObject, Icon, ObjectName, Loader } from 'ts/component';
import { blockStore, commonStore, dbStore, detailStore, menuStore } from 'ts/store';
import { AutoSizer, CellMeasurer, InfiniteLoader, List, CellMeasurerCache } from 'react-virtualized';
import { observer } from 'mobx-react';

interface Props {
	isPopup?: boolean;
	dataset?: any;
};

interface State {
	loading: boolean;
};

const $ = require('jquery');
const Constant = require('json/constant.json');

const MAX_DEPTH = 100;
const LIMIT = 20;
const HEIGHT = 24;

const SKIP_TYPES_LOAD = [
	Constant.typeId.space,
];

const SKIP_TYPES_LIST = [
	Constant.typeId.space,
	Constant.typeId.type,
	Constant.typeId.relation,

	/*
	Constant.typeId.file, 
	Constant.typeId.image, 
	Constant.typeId.audio, 
	Constant.typeId.video,
	*/
];

const KEYS = [ 
	'id', 'name', 'snippet', 'layout', 'type', 'iconEmoji', 'iconImage', 'isHidden', 'isDeleted', 'isArchived', 'isFavorite', 'done', 
	'relationFormat', 'fileExt', 'fileMimeType', 'links', 
];

const Sidebar = observer(class Sidebar extends React.Component<Props, State> {

	_isMounted: boolean = false;
	state = {
		loading: false,
	};
	loaded: boolean = false;
	top: number = 0;
	id: string = '';
	ox: number = 0;
	oy: number = 0;
	width: number = 0;
	height: number = 0;
	timeout: number = 0;
	refList: any = null;
	cache: any = {};
	subId: string = '';

	constructor (props: any) {
		super(props);

		this.onExpand = this.onExpand.bind(this);
		this.onResizeStart = this.onResizeStart.bind(this);
		this.onDragStart = this.onDragStart.bind(this);
		this.onMouseEnter = this.onMouseEnter.bind(this);
		this.onMouseLeave = this.onMouseLeave.bind(this);
		this.onScroll = this.onScroll.bind(this);
	};

	render () {
		const { sidebar } = commonStore;
		const { width, height, x, y, fixed, snap } = sidebar;
		const { loading } = this.state;
		const items = this.getItems();
		const css: any = { width };
		const cn = [ 'sidebar' ];

		if (snap == I.MenuDirection.Left) {
			cn.push('left');
		};
		if (snap == I.MenuDirection.Right) {
			cn.push('right');
		};

		if (fixed) {
			cn.push('fixed');
		} else {
			css.height = height;
		};

		const rowRenderer = (param: any) => {
			const item: any = items[param.index];
			const length = item.length;
			const cn = [ 'item' ];
			const paddingLeft = 6 + item.depth * 12;
			const style = { ...param.style, paddingLeft };
			const id = this.getId(item);
			const check = Storage.checkToggle('sidebar', id);

			if (check) {
				cn.push('active');
			};

			let content = null;
			let arrow = null;

			if (item.isSection) {
				cn.push('isSection');

				content = (
					<div className="clickable" onClick={(e: any) => { this.onToggle(e, id); }}>
						<div className="name">{item.details.name}</div>
						<div className="cnt">{length || ''}</div>
					</div>
				);
			} else {
				content = (
					<div className="clickable" onClick={(e: any) => { this.onClick(e, item); }}>
						<IconObject object={item.details} size={20} forceLetter={true} />
						<ObjectName object={item.details} />
					</div>
				);
			};

			if (length) {
				arrow = <Icon className="arrow" onMouseDown={(e: any) => { this.onToggle(e, id); }} />;
			} else {
				arrow = <Icon className="blank" />
			};

			return (
				<CellMeasurer
					key={param.key}
					parent={param.parent}
					cache={this.cache}
					columnIndex={0}
					rowIndex={param.index}
					hasFixedWidth={() => {}}
				>
					<div id={'item-' + id} className={cn.join(' ')} style={style} onContextMenu={(e: any) => { this.onContext(e, item); }}>
						{arrow}
						{content}
					</div>
				</CellMeasurer>
			);
		};

		return (
            <div 
				id="sidebar" 
				className={cn.join(' ')} 
				style={css} 
				onMouseEnter={this.onMouseEnter} 
				onMouseLeave={this.onMouseLeave}
			>

				<div className="head" onMouseDown={this.onDragStart}>
					<Icon className={fixed ? 'close' : 'expand'} onMouseDown={this.onExpand} />
				</div>
				
				<div className="body">
					{loading ? (
						<Loader />
					) : (
						<InfiniteLoader
							rowCount={items.length}
							loadMoreRows={() => {}}
							isRowLoaded={() => { return true; }}
							threshold={LIMIT}
						>
							{({ onRowsRendered, registerChild }) => (
								<AutoSizer className="scrollArea">
									{({ width, height }) => (
										<List
											ref={(ref: any) => { this.refList = ref; }}
											width={width}
											height={height}
											deferredMeasurmentCache={this.cache}
											rowCount={items.length}
											rowHeight={HEIGHT}
											rowRenderer={rowRenderer}
											onRowsRendered={onRowsRendered}
											overscanRowCount={LIMIT}
											onScroll={this.onScroll}
										/>
									)}
								</AutoSizer>
							)}
						</InfiniteLoader>
					)}
				</div>

				<div className="resize-h" onMouseDown={(e: any) => { this.onResizeStart(e, I.MenuType.Horizontal); }} />
				<div className="resize-v" onMouseDown={(e: any) => { this.onResizeStart(e, I.MenuType.Vertical); }} />
            </div>
		);
	};

	componentDidMount () {
		this._isMounted = true;
		this.subId = dbStore.getSubId('sidebar', '');
		this.init();
		this.resize();
		this.rebind();
		this.restore();
	};

	componentDidUpdate () {
		const items = this.getItems();

		this.resize();
		this.restore();

		this.cache = new CellMeasurerCache({
			fixedWidth: true,
			defaultHeight: HEIGHT,
			keyMapper: (i: number) => { return (items[i] || {}).id; },
		});
	};

	componentWillUnmount () {
		this._isMounted = false;
		this.unbind();

		window.clearTimeout(this.timeout);
		C.ObjectSearchUnsubscribe([ this.subId ]);
	};

	rebind () {
		this.unbind();
		$(window).on('resize.sidebar', (e: any) => { this.resize(); });
	};

	unbind () {
		const node = $(ReactDOM.findDOMNode(this));
		const body = node.find('.body');

		$(window).unbind('resize.sidebar');
		body.unbind('.scroll');
	};

	init () {
		if (!this.loaded && !this.state.loading) {
			this.load();
		};
	};

	restore () {
		const { sidebar } = commonStore;
		const { x, y, snap } = sidebar;
		const node = $(ReactDOM.findDOMNode(this));
		const body = node.find('.body');
		const dummy = $('#sidebarDummy');

		this.width = node.width();
		this.height = node.height();

		body.scrollTop(this.top);

		this.setActive(this.id);
		this.setStyle(x, y, snap);

		dummy.css({ width: this.width });
	};

	load () {
		const { root, profile } = blockStore;
		const filters: any[] = [
			{ operator: I.FilterOperator.And, relationKey: 'isHidden', condition: I.FilterCondition.Equal, value: false },
			{ operator: I.FilterOperator.And, relationKey: 'isArchived', condition: I.FilterCondition.Equal, value: false },
			{ 
				operator: I.FilterOperator.And, relationKey: 'id', condition: I.FilterCondition.NotIn, 
				value: [
					'_anytype_profile',
					profile,
					root,
				]
			},
			{ operator: I.FilterOperator.And, relationKey: 'type', condition: I.FilterCondition.NotIn, value: SKIP_TYPES_LOAD },
		];

		this.setState({ loading: true });
		C.ObjectSearchSubscribe(this.subId, filters, [], KEYS, [], 0, 0, true, '', '', () => {
			this.loaded = true;
			this.setState({ loading: false });
		});
	};

	idsMap (ids: string[]) {
		return (ids || []).map((id: string) => { return detailStore.get(this.subId, id, KEYS, true); }).filter(it => this.filterMapper(it));
	};

	getSections () {
		let sections: any[] = [
			{ id: I.TabIndex.Favorite, name: 'Favorites' },
			{ id: I.TabIndex.Recent, name: 'Recent' },
			{ id: I.TabIndex.Set, name: 'Sets' },
		];
		let children: I.Block[] = [];
		let ids: string[] = [];
		let records: any[] = [];

		sections = sections.map((s: any) => {
			s.children = [];
			s.isSection = true;

			switch (s.id) {
				case I.TabIndex.Favorite:
					children = blockStore.getChildren(blockStore.root, blockStore.root, (it: I.Block) => { return it.isLink(); });
					ids = children.map((it: I.Block) => { return it.content.targetBlockId; });

					s.children = this.idsMap(ids);
					break;

				case I.TabIndex.Recent:
					children = blockStore.getChildren(blockStore.recent, blockStore.recent, (it: I.Block) => { return it.isLink(); });
					ids = children.map((it: I.Block) => { return it.content.targetBlockId; }).reverse();

					s.children = this.idsMap(ids).filter(it => this.filterMapper(it)).slice(0, LIMIT);
					break;

				case I.TabIndex.Set:
					records = this.idsMap(dbStore.getRecords(this.subId, '').map(it => it.id));

					s.children = records.filter((c: any) => { return c.type == Constant.typeId.set; });
					s.children = s.children.filter(it => this.filterMapper(it)).slice(0, LIMIT);
					break;

			};

			return s;
		});

		return sections;
	};

	unwrap (sectionId: string, list: any[], parentId: string, items: any[], depth: number) {
		if (depth >= MAX_DEPTH) {
			return list;
		};

		for (let item of items) {
			const children = this.idsMap(item.links);
			const length = children.length;
			const newItem = {
				details: item,
				id: item.id,
				depth,
				length,
				parentId,
				sectionId,
			};
			list.push(newItem);

			if (length) {
				const check = Storage.checkToggle('sidebar', this.getId({ ...newItem, sectionId }));
				if (check) {
					list = this.unwrap(sectionId, list, item.id, children, depth + 1);
				};
			};
		};
		return list;
	};

	getItems () {
		const sections = this.getSections();

		let items: any[] = [];
		sections.forEach((section: any) => {
			const length = section.children.length;
			const item = {
				details: {
					id: section.id,
					name: section.name,
				},
				length,
				depth: 0,
				id: section.id,
				parentId: '',
				sectionId: '',
				isSection: true,
			};
			items.push(item);

			if (length) {
				const check = Storage.checkToggle('sidebar', this.getId(item));
				if (check) {
					items = this.unwrap(section.id, items, section.id, section.children, 1);
				};
			};
		});

		return items;
	};

	sortByIds (ids: string[], c1: any, c2: any) {
		const i1 = ids.indexOf(c1);
		const i2 = ids.indexOf(c2);
		if (i1 > i2) return 1; 
		if (i1 < i2) return -1;
		return 0;
	};

	filterMapper (it: any) {
		if (SKIP_TYPES_LIST.includes(it.type)) {
			return false;
		};
		return !it._empty_ && !it.isDeleted && !it.isHidden;
	};

	onScroll ({ clientHeight, scrollHeight, scrollTop }) {
		if (scrollTop) {
			this.top = scrollTop;
		};
	};

	onToggle (e: any, id: string) {
		if (!this._isMounted) {
			return;
		};

		e.preventDefault();
		e.stopPropagation();

		Storage.setToggle('sidebar', id, !Storage.checkToggle('sidebar', id));
		this.forceUpdate();
	};

	onExpand (e: any) {
		e.preventDefault();
		e.stopPropagation();

		const { sidebar } = commonStore;
		const fixed = !sidebar.fixed;
		const update: any = { fixed };

		if (fixed) {
			update.x = 0;
			update.y = 0;
		};

		commonStore.sidebarSet(update);
	};

	setActive (id: string) {
		const node = $(ReactDOM.findDOMNode(this));

		node.find('.item.hover').removeClass('hover');

		if (id) {
			node.find(`#item-${id}`).addClass('hover');
		};
	};

	getId (item: any) {
		const { sectionId, parentId, id, depth } = item;
		return [ sectionId, parentId, id, depth ].join('-');
	};

	onClick (e: any, item: any) {
		e.preventDefault();
		e.stopPropagation();

		this.id = this.getId(item);
		this.setActive(this.id);

		DataUtil.objectOpenEvent(e, item.details);
	};

	onContext (e: any, item: any): void {
		e.preventDefault();
		e.stopPropagation();

		const { x, y } = keyboard.mouse.page;

		this.setActive(this.getId(item));

		menuStore.open('dataviewContext', {
			rect: { width: 0, height: 0, x: x + 20, y: y },
			vertical: I.MenuDirection.Center,
			classNameWrap: 'fromPopup',
			onClose: () => {
				this.setActive(this.id);
			},
			data: {
				objectId: item.id,
				subId: this.subId,
			}
		});
	};

	onMouseEnter (e: any) {
		window.clearTimeout(this.timeout);
	};

	onMouseLeave (e: any) {
		if (!this._isMounted || keyboard.isResizing || keyboard.isDragging) {
			return;
		};

		const { sidebar } = commonStore;
		const { snap, fixed } = sidebar;

		if (fixed || (snap === null)) {
			return;
		};

		window.clearTimeout(this.timeout);
		this.timeout = window.setTimeout(() => {
			const node = $(ReactDOM.findDOMNode(this));
			node.removeClass('active');
		}, 1000);
	};

	onResizeStart (e: any, dir: I.MenuType) {
		if (!this._isMounted) {
			return;
		};

		const { dataset } = this.props;
		const { selection } = dataset || {};
		const { sidebar } = commonStore;
		const { fixed } = sidebar;
		const node = $(ReactDOM.findDOMNode(this));
		const win = $(window);
		const body = $('body');
		const offset = node.offset();

		if (fixed && (dir == I.MenuType.Vertical)) {
			return;
		};
		
		this.width = node.width();
		this.height = node.height();
		this.ox = offset.left;
		this.oy = offset.top;

		if (selection) {
			selection.preventSelect(true);
		};

		keyboard.setResize(true);
		body.addClass(dir == I.MenuType.Vertical ? 'rowResize' : 'colResize');
		win.unbind('mousemove.sidebar mouseup.sidebar');
		win.on('mousemove.sidebar', (e: any) => { this.onResizeMove(e, dir); });
		win.on('mouseup.sidebar', (e: any) => { this.onResizeEnd(e, dir); });
	};

	onResizeMove (e: any, dir: I.MenuType) {
		const { sidebar } = commonStore;
		const { snap, width, fixed } = sidebar;
		const win = $(window);
		const node = $(ReactDOM.findDOMNode(this));

		if (dir == I.MenuType.Horizontal) {
			const d = (snap == I.MenuDirection.Right) ? (this.ox - e.pageX + width) : e.pageX - this.ox;
	
			this.width = this.getWidth(d);
			this.resizeHeaderFooter(this.width);

			if (fixed) {
				win.trigger('resize.editor');
			};
		};

		if (dir == I.MenuType.Vertical) {
			this.height = this.getHeight(e.pageY - this.oy);
			node.css({ height: this.height });
		};
	};

	onResizeEnd (e: any, dir: I.MenuType) {
		const { dataset } = this.props;
		const { selection } = dataset || {};
		const update: any = {};

		if (dir == I.MenuType.Horizontal) {
			update.width = this.width;
		};
		if (dir == I.MenuType.Vertical) {
			update.height = this.height;
		};
		commonStore.sidebarSet(update);

		if (selection) {
			selection.preventSelect(false);
		};

		keyboard.setResize(false);
		$('body').removeClass('rowResize colResize');
		$(window).unbind('mousemove.sidebar mouseup.sidebar');
	};

	onDragStart (e: any) {
		const { dataset } = this.props;
		const { selection } = dataset || {};
		const { sidebar } = commonStore;
		const { fixed } = sidebar;

		if (fixed) {
			return;
		};

		const win = $(window);
		const node = $(ReactDOM.findDOMNode(this));
		const offset = node.offset();

		this.width = node.width();
		this.height = node.height();
		this.ox = e.pageX - offset.left;
		this.oy = e.pageY - offset.top;

		keyboard.setDrag(true);
		if (selection) {
			selection.preventSelect(true);
		};

		win.unbind('mousemove.sidebar mouseup.sidebar');
		win.on('mousemove.sidebar', (e: any) => { this.onDragMove(e); });
		win.on('mouseup.sidebar', (e: any) => { this.onDragEnd(e); });
	};

	onDragMove (e: any) {
		const win = $(window);
		const x = e.pageX - this.ox - win.scrollLeft();
		const y = e.pageY - this.oy - win.scrollTop();

		this.setStyle(x, y, null);
	};

	onDragEnd (e: any) {
		const { dataset } = this.props;
		const { selection } = dataset || {};
		const win = $(window);
		
		let x = e.pageX - this.ox - win.scrollLeft();
		let y = e.pageY - this.oy - win.scrollTop();
		let snap = null;

		if (x <= 0) {
			snap = I.MenuDirection.Left;
		};
		if (x + this.width >= win.width()) {
			snap = I.MenuDirection.Right;
		};

		if (snap !== null) {
			x = 0;
		};

		commonStore.sidebarSet({ x, y, snap });
		this.setStyle(x, y, snap);

		$(window).unbind('mousemove.sidebar mouseup.sidebar');

		keyboard.setDrag(false);
		if (selection) {
			selection.preventSelect(false);
		};
	};

	getWidth (w: number) {
		const size = Constant.size.sidebar.width;
		return Math.max(size.min, Math.min(size.max, w));
	};

	getHeight (h: number) {
		const win = $(window);
		const size = Constant.size.sidebar.height;
		return Math.max(size.min, Math.min(win.height() - Util.sizeHeader(), h));
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

	setStyle (x: number, y: number, snap: I.MenuDirection) {
		const node = $(ReactDOM.findDOMNode(this));
		const coords = this.checkCoords(x, y);

		node.css({ 
			top: coords.y,
			left: (snap === null ? coords.x : ''),
		});
	};

	resize () {
		if (!this._isMounted) {
			return;
		};

		const { sidebar } = commonStore;
		const { width } = sidebar;

		this.resizeHeaderFooter(width);
	};

	resizeHeaderFooter (width: number) {
		const node = $(ReactDOM.findDOMNode(this));
		const dummy = $('#sidebarDummy');
		
		node.css({ width });
		dummy.css({ width });

		Util.resizeHeaderFooter(width, this.props.isPopup);
	};

});

export default Sidebar;