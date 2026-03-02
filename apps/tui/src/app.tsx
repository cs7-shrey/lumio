import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { useChat } from './hooks/useChat.js';

export default function App({}) {
	const { query, setQuery, messages, generating, submit } = useChat();

	return (
		<Box
			alignItems="center"
			flexDirection='column'
		>
			<Box
				flexDirection='column'
				width={"100%"}
				alignItems='flex-start'
				gap={1}
			>
				{messages.map((message, index) => {
					switch(message.role) {
						case 'user':
							return (
								<Text key={index} backgroundColor={"gray"}>❯ {
									typeof message.content === "string" ? message.content : 
										typeof message.content.map((el) => el.type === "text" ? el.text : "")
								} </Text>
							)
						case 'assistant':
							return (
								message.content.map((content, index2) => {
									if(content.type === "thinking") {
										return <Text key={index * 10 + index2} color={"gray"}>
											{content.thinking}
										</Text>
									}
									else if(content.type === "text") {
										return <Text key={index * 10 + index2}>
											{content.text}
										</Text>
									}
									else {
										return <></>
									}
								})
							)
						default:
							return null
					}
				})}
			</Box>
			<Box
				borderBottom={true}
				borderTop={true}
				borderRight={false}
				borderLeft={false}
				borderColor={"gray"}
				borderStyle="single"
				width={"100%"}
				marginTop={1}
			><Text>❯ </Text>
				<TextInput
					showCursor={true}
					value={query} onChange={setQuery}
					onSubmit={() => {
						submit();
					}}
				/>
				{generating && <Text color={"green"}>Generating...</Text>}
			</Box>
		</Box>
	);
}
