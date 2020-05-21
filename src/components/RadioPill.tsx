import React from 'react';
import Button from '@material-ui/core/Button';
import { Tooltip } from './tooltips';

type RadioPillProps = {
	label: string;
	onClick: () => void;
	name: string;
	checked: boolean;
	disabled?: boolean;
	tooltip?: string;
	style?: any;
};

const RadioPill = ({ label, onClick, name, checked, disabled, tooltip, style }: RadioPillProps) => {
	const button = (
		<Button onClick={onClick} size="small" color="primary" variant="outlined" style={style} disabled={disabled}>
			<input
				type="radio"
				name={name}
				checked={checked}
				onChange={(): void => {}}
			/>
			<span>{label}</span>
		</Button>
	);

	if (tooltip) {
		return (
			<Tooltip title={<span dangerouslySetInnerHTML={{ __html: tooltip }} />}
				arrow
				disableHoverListener={disabled}
				disableFocusListener={disabled}>
				<span>
					{button}
				</span>
			</Tooltip>
		);
	}

	return button;
};

RadioPill.defaultProps = {
	disabled: false,
	style: {}
};

export default RadioPill;
