import React, { useState } from 'react';
import { Box } from 'ink';
import TextInput from 'ink-text-input';

type Props = {
	name: string | undefined;
};

export default function App({name = 'Stranger'}: Props) {
	const [query, setQuery] = useState('');

	return (
		<Box
			borderStyle={{
				topLeft: '↘',
				top: '↓',
				topRight: '↙',
				left: '→',
				bottomLeft: '↗',
				bottom: '↑',
				bottomRight: '↖',
				right: '←',
			}}
			alignItems="center"
		>
			<TextInput 
				showCursor={true}
				value={query} onChange={setQuery}
				onSubmit={() => {
					console.log('Submitted:', query);
					setQuery('');
				}}
			/>
		</Box>
	);
}
