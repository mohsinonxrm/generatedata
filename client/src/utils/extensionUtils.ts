const customFooterLinks: JSX.Element[] = [];

// to keep things simple, a registered footer link should be wrapped in it's own <li>. That way it can
// supply any additional styling for the whole link externally.
export const registerCustomFooterLink = (link: JSX.Element): void => {
	customFooterLinks.push(link);
};

export const getCustomFooterLinks = (): JSX.Element[] => customFooterLinks;
