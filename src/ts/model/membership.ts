import { I, UtilCommon } from 'Lib';
import { observable, intercept, makeObservable } from 'mobx';

class Membership implements I.Membership {

	tier: I.MembershipTier = I.MembershipTier.None;
	status: I.MembershipStatus = I.MembershipStatus.Unknown;
	dateStarted = 0;
	dateEnds = 0;
	isAutoRenew = false;
	nextTier: I.MembershipTier = I.MembershipTier.None;
	nextTierEnds = 0;
	paymentMethod: I.PaymentMethod = I.PaymentMethod.Card;
	requestedAnyName = '';
	userEmail = '';
	subscribeToNewsletter = false;

	constructor (props: I.Membership) {
		this.tier = Number(props.tier) || I.MembershipTier.None;
		this.status = Number(props.status) || I.MembershipStatus.Unknown;
		this.dateStarted = Number(props.dateStarted) || 0;
		this.dateEnds = Number(props.dateEnds) || 0;
		this.isAutoRenew = Boolean(props.isAutoRenew);
		this.nextTier = Number(props.nextTier) || I.MembershipTier.None;
		this.nextTierEnds = Number(props.nextTierEnds) || 0;
		this.paymentMethod = Number(props.paymentMethod) || I.PaymentMethod.Card;
		this.requestedAnyName = String(props.requestedAnyName || '');
		this.userEmail = String(props.userEmail || '');
		this.subscribeToNewsletter = Boolean(props.subscribeToNewsletter)

		makeObservable(this, {
			tier: observable,
			status: observable,
			dateStarted: observable,
			dateEnds: observable,
			isAutoRenew: observable,
			nextTier: observable,
			nextTierEnds: observable,
			paymentMethod: observable,
			requestedAnyName: observable,
			userEmail: observable,
			subscribeToNewsletter: observable,
		});

		intercept(this as any, change => UtilCommon.intercept(this, change));
	};

};

export default Membership;