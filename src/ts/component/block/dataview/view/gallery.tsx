import * as React from 'react';
import { I } from 'ts/lib';

import Cell from '../cell';

interface Props extends I.ViewComponent {};

class ViewGallery extends React.Component<Props, {}> {

	render () {
		const { content } = this.props;
		const { data, view } = content;
		
		const Card = (item: any) => (
			<div className="card">
				{view.relations.map((relation: any, i: number) => (
					<Cell key={relation.id} id={item.index} view={view} relation={...relation} data={data[item.index]} />
				))}
			</div>
		);
		
		return (
			<div className="wrap">
				<div className="view viewGallery">
					{data.map((item: any, i: number) => (
						<Card key={i} index={i} {...item} />
					))}
				</div>
			</div>
		);
	};
	
};

export default ViewGallery;