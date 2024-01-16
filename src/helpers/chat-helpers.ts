/* eslint-disable @typescript-eslint/no-unused-vars */
import { sendCompletionRequest } from "../api/connectionAPI";
import { Character } from "../global_classes/Character";
import { Message } from "../global_classes/CompletionRequest";

export async function continueConversation(messages: Message[], character: Character){
    const unparsedResponse = await sendCompletionRequest(messages, character).then((response) => {
        console.log(response);
        return response;
    }).catch((error) => {
        console.log(error);
    });
    if(unparsedResponse === null){
        return null;
    }
    const value = unparsedResponse?.completion?.choices[0]?.text.trim();
    console.log(value);
    const refinedResponse = breakUpCommands(character.name, value, 'You', null, false);
    const assistantResponse: Message = {
        userId: character._id,
        fallbackName: character.name,
        swipes: [refinedResponse],
        currentIndex: 0,
        role: 'Assistant',
        thought: false,
    };
    return assistantResponse;
}

export function breakUpCommands(charName: string, commandString: string, user = 'You', stopList: string[] = [], doMultiLine: boolean = false): string {
    const lines = commandString.split('\n').filter((line) => {
        return line.trim() !== '';
    });
    const formattedCommands = [];
    let currentCommand = '';
    let isFirstLine = true;
    
    if (doMultiLine === false){
        let command = lines[0];
        if(command.trim() === ''){
            if(lines.length > 1){
                command = lines[1];
            }
        }
        return command.replaceAll('<start>', '')
        .replaceAll('<end>', '').replaceAll('###', '')
        .replaceAll('<user>', '').replaceAll('user:', '')
        .replaceAll('USER:', '').replaceAll('ASSISTANT:', '')
        .replaceAll('<|user|>', '').replaceAll('<|model|>', '')
        .replaceAll(`${charName}: `, '')
        .replaceAll(`${user}: `, '')
        .replaceAll(`<BOT>`, charName)
        .replaceAll(`<bot>`, charName)
        .replaceAll(`<CHAR>`, charName)
    }
    
    for (let i = 0; i < lines.length; i++) {
        // If the line starts with a colon, it's the start of a new command
        const lineToTest = lines[i].toLocaleLowerCase();
        
        if (lineToTest.startsWith(`${user.toLocaleLowerCase()}:`) || lineToTest.startsWith('you:') || lineToTest.startsWith('<start>') || lineToTest.startsWith('<end>') || lineToTest.startsWith('<user>') || lineToTest.toLocaleLowerCase().startsWith('user:')) {
          break;
        }
        
        if (stopList !== null) {
            for(let j = 0; j < stopList.length; j++){
                if(lineToTest.startsWith(`${stopList[j].toLocaleLowerCase()}`)){
                    break;
                }
            }
        }
        
        if (lineToTest.startsWith(`${charName}:`)) {
            isFirstLine = false;
            if (currentCommand !== '') {
                // Push the current command to the formattedCommands array
                currentCommand = currentCommand.replaceAll(`${charName}:`, '')
                formattedCommands.push(currentCommand.trim());
            }
            currentCommand = lines[i];
        } if(lineToTest.includes(':') && i >= 1){ // if the line has a colon, it's a new message from a different user. Return commands up to this point
            return formattedCommands.join('\n');
        } else {
            if (currentCommand !== '' || isFirstLine){
                currentCommand += (isFirstLine ? '' : '\n') + lines[i];
            }
            if (isFirstLine) isFirstLine = false;
        }
    }
    
    // Don't forget to add the last command
    if (currentCommand !== '') {
        formattedCommands.push(currentCommand.replaceAll(`${charName}:`, ''));
    }
    const removedEmptyLines = formattedCommands.filter((command) => {
        return command.trim() !== '';
    });
    const final = removedEmptyLines.join('\n');
    return final.replaceAll('<start>', '').replaceAll('<end>', '')
    .replaceAll('###', '').replaceAll('<user>', '')
    .replaceAll('user:', '').replaceAll('USER:', '')
    .replaceAll('ASSISTANT:', '').replaceAll('<|user|>', '')
    .replaceAll('<|model|>', '').replaceAll(`${charName}: `, '')
    .replaceAll(`${user}: `, '').replaceAll(`<BOT>`, charName)
    .replaceAll(`<bot>`, charName).replaceAll(`<CHAR>`, charName);
}