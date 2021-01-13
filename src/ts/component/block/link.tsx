import * as React from 'react';
import { RouteComponentProps } from 'react-router';
import { IconObject, Loader } from 'ts/component';
import { I, DataUtil, translate } from 'ts/lib';
import { blockStore } from 'ts/store';
import { observer } from 'mobx-react';
import { focus } from 'ts/lib';

interface Props extends I.BlockComponent, RouteComponentProps<any> {};

@observer
class BlockLink extends React.Component<Props, {}> {
	
	constructor (props: any) {
		super(props);
		
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onKeyUp = this.onKeyUp.bind(this);
		this.onClick = this.onClick.bind(this);
		this.onSelect = this.onSelect.bind(this);
		this.onUpload = this.onUpload.bind(this);
		this.onCheckbox = this.onCheckbox.bind(this);
		this.onFocus = this.onFocus.bind(this);
	};

	render() {
		const { rootId, block, readOnly } = this.props;
		const { id, content } = block;
		const details = blockStore.getDetails(rootId, content.targetBlockId);
		const { _detailsEmpty_, name, isArchived } = details;
		const cn = [ 'focusable', 'c' + id, (isArchived ? 'isArchived' : '') ];

		if (_detailsEmpty_) {
			return (
				<div className="loading">
					<Loader />
					<div className="name">{translate('blockLinkSyncing')}</div>
				</div>
			);
		};

		return (
			<div className={cn.join(' ')} tabIndex={0} onKeyDown={this.onKeyDown} onKeyUp={this.onKeyUp} onFocus={this.onFocus}>
				<IconObject 
					object={details} 
					id={'block-page-' + id} 
					offsetX={28} 
					offsetY={-24} 
					size={24} 
					canEdit={!readOnly} 
					onSelect={this.onSelect} 
					onUpload={this.onUpload}
					onCheckbox={this.onCheckbox}
				/>
				<div className="name" onClick={this.onClick}>
					<div className="txt">{name}</div>
				</div>
				<div className="archive">{translate('blockLinkArchived')}</div>
			</div>
		);
	};
	
	onKeyDown (e: any) {
		this.props.onKeyDown(e, '', [], { from: 0, to: 0 });
	};
	
	onKeyUp (e: any) {
		this.props.onKeyUp(e, '', [], { from: 0, to: 0 });
	};

	onFocus () {
		const { block } = this.props;
		focus.set(block.id, { from: 0, to: 0 });
	};
	
	onClick (e: any) {
		const { rootId, block } = this.props;
		const { content } = block;
		const { targetBlockId } = content;
		const details = blockStore.getDetails(rootId, targetBlockId);
		const { _detailsEmpty_ } = details;
		
		if (!_detailsEmpty_ && (targetBlockId != rootId)) {
			DataUtil.pageOpenEvent(e, targetBlockId);
		};
	};
	
	onSelect (icon: string) {
		const { block } = this.props;
		const { content } = block;
		const { targetBlockId } = content;
		
		DataUtil.pageSetIcon(targetBlockId, icon, '');
	};

	onUpload (hash: string) {
		const { block } = this.props;
		const { content } = block;
		const { targetBlockId } = content;
		
		DataUtil.pageSetIcon(targetBlockId, '', hash);
	};

	onCheckbox () {
		const { rootId, block } = this.props;
		const { content } = block;
		const { targetBlockId } = content;
		const details = blockStore.getDetails(rootId, targetBlockId);

		DataUtil.pageSetDone(targetBlockId, !details.done);
	};
	
};

export default BlockLink;