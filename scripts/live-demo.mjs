import readline from 'node:readline';
import { spawn } from 'node:child_process';

if(!process.stdin.isTTY){console.error('Use an interactive Terminal for private key entry.');process.exit(1);}
async function secret(){
 process.stdout.write('Paste your EXISTING OpenAI API key (hidden, kept only in process memory): ');
 readline.emitKeypressEvents(process.stdin);process.stdin.setRawMode(true);process.stdin.resume();
 return await new Promise(resolve=>{let value='';const handler=(str,key)=>{if(key?.ctrl&&key.name==='c'){process.stdout.write('\nCanceled.\n');process.exit(1);}if(key?.name==='return'){process.stdin.off('keypress',handler);process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');resolve(value.trim());return;}if(key?.name==='backspace'){value=value.slice(0,-1);return;}if(str && !key?.ctrl && !key?.meta)value+=str;};process.stdin.on('keypress',handler);});
}
const key=process.env.OPENAI_API_KEY || await secret();
if(!key || /\s/.test(key)){console.error('Key entry was empty or contained whitespace. Nothing sent.');process.exit(1);}
const rl=readline.createInterface({input:process.stdin,output:process.stdout});
const answer=await new Promise(resolve=>rl.question('Authorize sending representative mission data to OpenAI, with a $2.00 cumulative conservative workspace reservation cap and at most 100 requests (including previous usage)? Type YES: ',resolve));rl.close();
if(String(answer).trim()!=='YES'){console.log('No live API use authorized.');process.exit(0);}
console.log('Starting local demo. The key is not written to a file. Click Run five live AI reviews in the dashboard.');
const child=spawn(process.execPath,['--experimental-strip-types','src/server.ts'],{stdio:'inherit',env:{...process.env,OPENAI_API_KEY:key,OPS_LIVE_AI_APPROVED:'1'}});
child.on('exit',code=>process.exit(code??1));process.on('SIGINT',()=>child.kill('SIGINT'));
