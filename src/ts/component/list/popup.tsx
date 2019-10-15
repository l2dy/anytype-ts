import * as React from 'react';
import { Popup } from 'ts/component';
import { observer, inject } from 'mobx-react';
import { I } from 'ts/lib';

interface Props {
	history: any;
	commonStore?: any;
};

@inject('commonStore')
@observer
class ListPopup extends React.Component<Props, {}> {

	constructor (props: any) {
		super(props);
		
		this.close = this.close.bind(this);
	};
	
	render () {
		const { history, commonStore } = this.props;
		const { popups } = commonStore;
		const dimmer = <div className="dimmer" onMouseDown={this.close} />;
		
		return (
			<div className="popups">
				{popups.map((item: I.Popup, i: number) => (
					<Popup history={history} key={item.id} {...item} />
				))}
				{popups.length ? dimmer : ''}
			</div>
		);
	};
	
	close () {
		const { commonStore } = this.props;
		commonStore.popupCloseAll();
	};
	
};

export default ListPopup;