require('./sourcemap-register.js');module.exports=(()=>{"use strict";var e={351:function(e,t,n){var i=this&&this.__createBinding||(Object.create?function(e,t,n,i){if(i===undefined)i=n;Object.defineProperty(e,i,{enumerable:true,get:function(){return t[n]}})}:function(e,t,n,i){if(i===undefined)i=n;e[i]=t[n]});var r=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:true,value:t})}:function(e,t){e["default"]=t});var o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(e!=null)for(var n in e)if(n!=="default"&&Object.hasOwnProperty.call(e,n))i(t,e,n);r(t,e);return t};Object.defineProperty(t,"__esModule",{value:true});t.issue=t.issueCommand=void 0;const s=o(n(87));const u=n(278);function issueCommand(e,t,n){const i=new Command(e,t,n);process.stdout.write(i.toString()+s.EOL)}t.issueCommand=issueCommand;function issue(e,t=""){issueCommand(e,{},t)}t.issue=issue;const c="::";class Command{constructor(e,t,n){if(!e){e="missing.command"}this.command=e;this.properties=t;this.message=n}toString(){let e=c+this.command;if(this.properties&&Object.keys(this.properties).length>0){e+=" ";let t=true;for(const n in this.properties){if(this.properties.hasOwnProperty(n)){const i=this.properties[n];if(i){if(t){t=false}else{e+=","}e+=`${n}=${escapeProperty(i)}`}}}}e+=`${c}${escapeData(this.message)}`;return e}}function escapeData(e){return u.toCommandValue(e).replace(/%/g,"%25").replace(/\r/g,"%0D").replace(/\n/g,"%0A")}function escapeProperty(e){return u.toCommandValue(e).replace(/%/g,"%25").replace(/\r/g,"%0D").replace(/\n/g,"%0A").replace(/:/g,"%3A").replace(/,/g,"%2C")}},186:function(e,t,n){var i=this&&this.__createBinding||(Object.create?function(e,t,n,i){if(i===undefined)i=n;Object.defineProperty(e,i,{enumerable:true,get:function(){return t[n]}})}:function(e,t,n,i){if(i===undefined)i=n;e[i]=t[n]});var r=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:true,value:t})}:function(e,t){e["default"]=t});var o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(e!=null)for(var n in e)if(n!=="default"&&Object.hasOwnProperty.call(e,n))i(t,e,n);r(t,e);return t};var s=this&&this.__awaiter||function(e,t,n,i){function adopt(e){return e instanceof n?e:new n(function(t){t(e)})}return new(n||(n=Promise))(function(n,r){function fulfilled(e){try{step(i.next(e))}catch(e){r(e)}}function rejected(e){try{step(i["throw"](e))}catch(e){r(e)}}function step(e){e.done?n(e.value):adopt(e.value).then(fulfilled,rejected)}step((i=i.apply(e,t||[])).next())})};Object.defineProperty(t,"__esModule",{value:true});t.getState=t.saveState=t.group=t.endGroup=t.startGroup=t.info=t.warning=t.error=t.debug=t.isDebug=t.setFailed=t.setCommandEcho=t.setOutput=t.getBooleanInput=t.getMultilineInput=t.getInput=t.addPath=t.setSecret=t.exportVariable=t.ExitCode=void 0;const u=n(351);const c=n(717);const l=n(278);const f=o(n(87));const a=o(n(622));var d;(function(e){e[e["Success"]=0]="Success";e[e["Failure"]=1]="Failure"})(d=t.ExitCode||(t.ExitCode={}));function exportVariable(e,t){const n=l.toCommandValue(t);process.env[e]=n;const i=process.env["GITHUB_ENV"]||"";if(i){const t="_GitHubActionsFileCommandDelimeter_";const i=`${e}<<${t}${f.EOL}${n}${f.EOL}${t}`;c.issueCommand("ENV",i)}else{u.issueCommand("set-env",{name:e},n)}}t.exportVariable=exportVariable;function setSecret(e){u.issueCommand("add-mask",{},e)}t.setSecret=setSecret;function addPath(e){const t=process.env["GITHUB_PATH"]||"";if(t){c.issueCommand("PATH",e)}else{u.issueCommand("add-path",{},e)}process.env["PATH"]=`${e}${a.delimiter}${process.env["PATH"]}`}t.addPath=addPath;function getInput(e,t){const n=process.env[`INPUT_${e.replace(/ /g,"_").toUpperCase()}`]||"";if(t&&t.required&&!n){throw new Error(`Input required and not supplied: ${e}`)}if(t&&t.trimWhitespace===false){return n}return n.trim()}t.getInput=getInput;function getMultilineInput(e,t){const n=getInput(e,t).split("\n").filter(e=>e!=="");return n}t.getMultilineInput=getMultilineInput;function getBooleanInput(e,t){const n=["true","True","TRUE"];const i=["false","False","FALSE"];const r=getInput(e,t);if(n.includes(r))return true;if(i.includes(r))return false;throw new TypeError(`Input does not meet YAML 1.2 "Core Schema" specification: ${e}\n`+`Support boolean input list: \`true | True | TRUE | false | False | FALSE\``)}t.getBooleanInput=getBooleanInput;function setOutput(e,t){process.stdout.write(f.EOL);u.issueCommand("set-output",{name:e},t)}t.setOutput=setOutput;function setCommandEcho(e){u.issue("echo",e?"on":"off")}t.setCommandEcho=setCommandEcho;function setFailed(e){process.exitCode=d.Failure;error(e)}t.setFailed=setFailed;function isDebug(){return process.env["RUNNER_DEBUG"]==="1"}t.isDebug=isDebug;function debug(e){u.issueCommand("debug",{},e)}t.debug=debug;function error(e){u.issue("error",e instanceof Error?e.toString():e)}t.error=error;function warning(e){u.issue("warning",e instanceof Error?e.toString():e)}t.warning=warning;function info(e){process.stdout.write(e+f.EOL)}t.info=info;function startGroup(e){u.issue("group",e)}t.startGroup=startGroup;function endGroup(){u.issue("endgroup")}t.endGroup=endGroup;function group(e,t){return s(this,void 0,void 0,function*(){startGroup(e);let n;try{n=yield t()}finally{endGroup()}return n})}t.group=group;function saveState(e,t){u.issueCommand("save-state",{name:e},t)}t.saveState=saveState;function getState(e){return process.env[`STATE_${e}`]||""}t.getState=getState},717:function(e,t,n){var i=this&&this.__createBinding||(Object.create?function(e,t,n,i){if(i===undefined)i=n;Object.defineProperty(e,i,{enumerable:true,get:function(){return t[n]}})}:function(e,t,n,i){if(i===undefined)i=n;e[i]=t[n]});var r=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:true,value:t})}:function(e,t){e["default"]=t});var o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(e!=null)for(var n in e)if(n!=="default"&&Object.hasOwnProperty.call(e,n))i(t,e,n);r(t,e);return t};Object.defineProperty(t,"__esModule",{value:true});t.issueCommand=void 0;const s=o(n(747));const u=o(n(87));const c=n(278);function issueCommand(e,t){const n=process.env[`GITHUB_${e}`];if(!n){throw new Error(`Unable to find environment variable for file command ${e}`)}if(!s.existsSync(n)){throw new Error(`Missing file at path: ${n}`)}s.appendFileSync(n,`${c.toCommandValue(t)}${u.EOL}`,{encoding:"utf8"})}t.issueCommand=issueCommand},278:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.toCommandValue=void 0;function toCommandValue(e){if(e===null||e===undefined){return""}else if(typeof e==="string"||e instanceof String){return e}return JSON.stringify(e)}t.toCommandValue=toCommandValue},514:function(e,t,n){var i=this&&this.__createBinding||(Object.create?function(e,t,n,i){if(i===undefined)i=n;Object.defineProperty(e,i,{enumerable:true,get:function(){return t[n]}})}:function(e,t,n,i){if(i===undefined)i=n;e[i]=t[n]});var r=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:true,value:t})}:function(e,t){e["default"]=t});var o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(e!=null)for(var n in e)if(n!=="default"&&Object.hasOwnProperty.call(e,n))i(t,e,n);r(t,e);return t};var s=this&&this.__awaiter||function(e,t,n,i){function adopt(e){return e instanceof n?e:new n(function(t){t(e)})}return new(n||(n=Promise))(function(n,r){function fulfilled(e){try{step(i.next(e))}catch(e){r(e)}}function rejected(e){try{step(i["throw"](e))}catch(e){r(e)}}function step(e){e.done?n(e.value):adopt(e.value).then(fulfilled,rejected)}step((i=i.apply(e,t||[])).next())})};Object.defineProperty(t,"__esModule",{value:true});t.getExecOutput=t.exec=void 0;const u=n(304);const c=o(n(159));function exec(e,t,n){return s(this,void 0,void 0,function*(){const i=c.argStringToArray(e);if(i.length===0){throw new Error(`Parameter 'commandLine' cannot be null or empty.`)}const r=i[0];t=i.slice(1).concat(t||[]);const o=new c.ToolRunner(r,t,n);return o.exec()})}t.exec=exec;function getExecOutput(e,t,n){var i,r;return s(this,void 0,void 0,function*(){let o="";let s="";const c=new u.StringDecoder("utf8");const l=new u.StringDecoder("utf8");const f=(i=n===null||n===void 0?void 0:n.listeners)===null||i===void 0?void 0:i.stdout;const a=(r=n===null||n===void 0?void 0:n.listeners)===null||r===void 0?void 0:r.stderr;const d=e=>{s+=l.write(e);if(a){a(e)}};const p=e=>{o+=c.write(e);if(f){f(e)}};const h=Object.assign(Object.assign({},n===null||n===void 0?void 0:n.listeners),{stdout:p,stderr:d});const m=yield exec(e,t,Object.assign(Object.assign({},n),{listeners:h}));o+=c.end();s+=l.end();return{exitCode:m,stdout:o,stderr:s}})}t.getExecOutput=getExecOutput},159:function(e,t,n){var i=this&&this.__createBinding||(Object.create?function(e,t,n,i){if(i===undefined)i=n;Object.defineProperty(e,i,{enumerable:true,get:function(){return t[n]}})}:function(e,t,n,i){if(i===undefined)i=n;e[i]=t[n]});var r=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:true,value:t})}:function(e,t){e["default"]=t});var o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(e!=null)for(var n in e)if(n!=="default"&&Object.hasOwnProperty.call(e,n))i(t,e,n);r(t,e);return t};var s=this&&this.__awaiter||function(e,t,n,i){function adopt(e){return e instanceof n?e:new n(function(t){t(e)})}return new(n||(n=Promise))(function(n,r){function fulfilled(e){try{step(i.next(e))}catch(e){r(e)}}function rejected(e){try{step(i["throw"](e))}catch(e){r(e)}}function step(e){e.done?n(e.value):adopt(e.value).then(fulfilled,rejected)}step((i=i.apply(e,t||[])).next())})};Object.defineProperty(t,"__esModule",{value:true});t.argStringToArray=t.ToolRunner=void 0;const u=o(n(87));const c=o(n(614));const l=o(n(129));const f=o(n(622));const a=o(n(436));const d=o(n(962));const p=n(213);const h=process.platform==="win32";class ToolRunner extends c.EventEmitter{constructor(e,t,n){super();if(!e){throw new Error("Parameter 'toolPath' cannot be null or empty.")}this.toolPath=e;this.args=t||[];this.options=n||{}}_debug(e){if(this.options.listeners&&this.options.listeners.debug){this.options.listeners.debug(e)}}_getCommandString(e,t){const n=this._getSpawnFileName();const i=this._getSpawnArgs(e);let r=t?"":"[command]";if(h){if(this._isCmdFile()){r+=n;for(const e of i){r+=` ${e}`}}else if(e.windowsVerbatimArguments){r+=`"${n}"`;for(const e of i){r+=` ${e}`}}else{r+=this._windowsQuoteCmdArg(n);for(const e of i){r+=` ${this._windowsQuoteCmdArg(e)}`}}}else{r+=n;for(const e of i){r+=` ${e}`}}return r}_processLineBuffer(e,t,n){try{let i=t+e.toString();let r=i.indexOf(u.EOL);while(r>-1){const e=i.substring(0,r);n(e);i=i.substring(r+u.EOL.length);r=i.indexOf(u.EOL)}return i}catch(e){this._debug(`error processing line. Failed with error ${e}`);return""}}_getSpawnFileName(){if(h){if(this._isCmdFile()){return process.env["COMSPEC"]||"cmd.exe"}}return this.toolPath}_getSpawnArgs(e){if(h){if(this._isCmdFile()){let t=`/D /S /C "${this._windowsQuoteCmdArg(this.toolPath)}`;for(const n of this.args){t+=" ";t+=e.windowsVerbatimArguments?n:this._windowsQuoteCmdArg(n)}t+='"';return[t]}}return this.args}_endsWith(e,t){return e.endsWith(t)}_isCmdFile(){const e=this.toolPath.toUpperCase();return this._endsWith(e,".CMD")||this._endsWith(e,".BAT")}_windowsQuoteCmdArg(e){if(!this._isCmdFile()){return this._uvQuoteCmdArg(e)}if(!e){return'""'}const t=[" ","\t","&","(",")","[","]","{","}","^","=",";","!","'","+",",","`","~","|","<",">",'"'];let n=false;for(const i of e){if(t.some(e=>e===i)){n=true;break}}if(!n){return e}let i='"';let r=true;for(let t=e.length;t>0;t--){i+=e[t-1];if(r&&e[t-1]==="\\"){i+="\\"}else if(e[t-1]==='"'){r=true;i+='"'}else{r=false}}i+='"';return i.split("").reverse().join("")}_uvQuoteCmdArg(e){if(!e){return'""'}if(!e.includes(" ")&&!e.includes("\t")&&!e.includes('"')){return e}if(!e.includes('"')&&!e.includes("\\")){return`"${e}"`}let t='"';let n=true;for(let i=e.length;i>0;i--){t+=e[i-1];if(n&&e[i-1]==="\\"){t+="\\"}else if(e[i-1]==='"'){n=true;t+="\\"}else{n=false}}t+='"';return t.split("").reverse().join("")}_cloneExecOptions(e){e=e||{};const t={cwd:e.cwd||process.cwd(),env:e.env||process.env,silent:e.silent||false,windowsVerbatimArguments:e.windowsVerbatimArguments||false,failOnStdErr:e.failOnStdErr||false,ignoreReturnCode:e.ignoreReturnCode||false,delay:e.delay||1e4};t.outStream=e.outStream||process.stdout;t.errStream=e.errStream||process.stderr;return t}_getSpawnOptions(e,t){e=e||{};const n={};n.cwd=e.cwd;n.env=e.env;n["windowsVerbatimArguments"]=e.windowsVerbatimArguments||this._isCmdFile();if(e.windowsVerbatimArguments){n.argv0=`"${t}"`}return n}exec(){return s(this,void 0,void 0,function*(){if(!d.isRooted(this.toolPath)&&(this.toolPath.includes("/")||h&&this.toolPath.includes("\\"))){this.toolPath=f.resolve(process.cwd(),this.options.cwd||process.cwd(),this.toolPath)}this.toolPath=yield a.which(this.toolPath,true);return new Promise((e,t)=>s(this,void 0,void 0,function*(){this._debug(`exec tool: ${this.toolPath}`);this._debug("arguments:");for(const e of this.args){this._debug(`   ${e}`)}const n=this._cloneExecOptions(this.options);if(!n.silent&&n.outStream){n.outStream.write(this._getCommandString(n)+u.EOL)}const i=new ExecState(n,this.toolPath);i.on("debug",e=>{this._debug(e)});if(this.options.cwd&&!(yield d.exists(this.options.cwd))){return t(new Error(`The cwd: ${this.options.cwd} does not exist!`))}const r=this._getSpawnFileName();const o=l.spawn(r,this._getSpawnArgs(n),this._getSpawnOptions(this.options,r));let s="";if(o.stdout){o.stdout.on("data",e=>{if(this.options.listeners&&this.options.listeners.stdout){this.options.listeners.stdout(e)}if(!n.silent&&n.outStream){n.outStream.write(e)}s=this._processLineBuffer(e,s,e=>{if(this.options.listeners&&this.options.listeners.stdline){this.options.listeners.stdline(e)}})})}let c="";if(o.stderr){o.stderr.on("data",e=>{i.processStderr=true;if(this.options.listeners&&this.options.listeners.stderr){this.options.listeners.stderr(e)}if(!n.silent&&n.errStream&&n.outStream){const t=n.failOnStdErr?n.errStream:n.outStream;t.write(e)}c=this._processLineBuffer(e,c,e=>{if(this.options.listeners&&this.options.listeners.errline){this.options.listeners.errline(e)}})})}o.on("error",e=>{i.processError=e.message;i.processExited=true;i.processClosed=true;i.CheckComplete()});o.on("exit",e=>{i.processExitCode=e;i.processExited=true;this._debug(`Exit code ${e} received from tool '${this.toolPath}'`);i.CheckComplete()});o.on("close",e=>{i.processExitCode=e;i.processExited=true;i.processClosed=true;this._debug(`STDIO streams have closed for tool '${this.toolPath}'`);i.CheckComplete()});i.on("done",(n,i)=>{if(s.length>0){this.emit("stdline",s)}if(c.length>0){this.emit("errline",c)}o.removeAllListeners();if(n){t(n)}else{e(i)}});if(this.options.input){if(!o.stdin){throw new Error("child process missing stdin")}o.stdin.end(this.options.input)}}))})}}t.ToolRunner=ToolRunner;function argStringToArray(e){const t=[];let n=false;let i=false;let r="";function append(e){if(i&&e!=='"'){r+="\\"}r+=e;i=false}for(let o=0;o<e.length;o++){const s=e.charAt(o);if(s==='"'){if(!i){n=!n}else{append(s)}continue}if(s==="\\"&&i){append(s);continue}if(s==="\\"&&n){i=true;continue}if(s===" "&&!n){if(r.length>0){t.push(r);r=""}continue}append(s)}if(r.length>0){t.push(r.trim())}return t}t.argStringToArray=argStringToArray;class ExecState extends c.EventEmitter{constructor(e,t){super();this.processClosed=false;this.processError="";this.processExitCode=0;this.processExited=false;this.processStderr=false;this.delay=1e4;this.done=false;this.timeout=null;if(!t){throw new Error("toolPath must not be empty")}this.options=e;this.toolPath=t;if(e.delay){this.delay=e.delay}}CheckComplete(){if(this.done){return}if(this.processClosed){this._setResult()}else if(this.processExited){this.timeout=p.setTimeout(ExecState.HandleTimeout,this.delay,this)}}_debug(e){this.emit("debug",e)}_setResult(){let e;if(this.processExited){if(this.processError){e=new Error(`There was an error when attempting to execute the process '${this.toolPath}'. This may indicate the process failed to start. Error: ${this.processError}`)}else if(this.processExitCode!==0&&!this.options.ignoreReturnCode){e=new Error(`The process '${this.toolPath}' failed with exit code ${this.processExitCode}`)}else if(this.processStderr&&this.options.failOnStdErr){e=new Error(`The process '${this.toolPath}' failed because one or more lines were written to the STDERR stream`)}}if(this.timeout){clearTimeout(this.timeout);this.timeout=null}this.done=true;this.emit("done",e,this.processExitCode)}static HandleTimeout(e){if(e.done){return}if(!e.processClosed&&e.processExited){const t=`The STDIO streams did not close within ${e.delay/1e3} seconds of the exit event from process '${e.toolPath}'. This may indicate a child process inherited the STDIO streams and has not yet exited.`;e._debug(t)}e._setResult()}}},962:function(e,t,n){var i=this&&this.__createBinding||(Object.create?function(e,t,n,i){if(i===undefined)i=n;Object.defineProperty(e,i,{enumerable:true,get:function(){return t[n]}})}:function(e,t,n,i){if(i===undefined)i=n;e[i]=t[n]});var r=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:true,value:t})}:function(e,t){e["default"]=t});var o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(e!=null)for(var n in e)if(n!=="default"&&Object.hasOwnProperty.call(e,n))i(t,e,n);r(t,e);return t};var s=this&&this.__awaiter||function(e,t,n,i){function adopt(e){return e instanceof n?e:new n(function(t){t(e)})}return new(n||(n=Promise))(function(n,r){function fulfilled(e){try{step(i.next(e))}catch(e){r(e)}}function rejected(e){try{step(i["throw"](e))}catch(e){r(e)}}function step(e){e.done?n(e.value):adopt(e.value).then(fulfilled,rejected)}step((i=i.apply(e,t||[])).next())})};var u;Object.defineProperty(t,"__esModule",{value:true});t.getCmdPath=t.tryGetExecutablePath=t.isRooted=t.isDirectory=t.exists=t.IS_WINDOWS=t.unlink=t.symlink=t.stat=t.rmdir=t.rename=t.readlink=t.readdir=t.mkdir=t.lstat=t.copyFile=t.chmod=void 0;const c=o(n(747));const l=o(n(622));u=c.promises,t.chmod=u.chmod,t.copyFile=u.copyFile,t.lstat=u.lstat,t.mkdir=u.mkdir,t.readdir=u.readdir,t.readlink=u.readlink,t.rename=u.rename,t.rmdir=u.rmdir,t.stat=u.stat,t.symlink=u.symlink,t.unlink=u.unlink;t.IS_WINDOWS=process.platform==="win32";function exists(e){return s(this,void 0,void 0,function*(){try{yield t.stat(e)}catch(e){if(e.code==="ENOENT"){return false}throw e}return true})}t.exists=exists;function isDirectory(e,n=false){return s(this,void 0,void 0,function*(){const i=n?yield t.stat(e):yield t.lstat(e);return i.isDirectory()})}t.isDirectory=isDirectory;function isRooted(e){e=normalizeSeparators(e);if(!e){throw new Error('isRooted() parameter "p" cannot be empty')}if(t.IS_WINDOWS){return e.startsWith("\\")||/^[A-Z]:/i.test(e)}return e.startsWith("/")}t.isRooted=isRooted;function tryGetExecutablePath(e,n){return s(this,void 0,void 0,function*(){let i=undefined;try{i=yield t.stat(e)}catch(t){if(t.code!=="ENOENT"){console.log(`Unexpected error attempting to determine if executable file exists '${e}': ${t}`)}}if(i&&i.isFile()){if(t.IS_WINDOWS){const t=l.extname(e).toUpperCase();if(n.some(e=>e.toUpperCase()===t)){return e}}else{if(isUnixExecutable(i)){return e}}}const r=e;for(const o of n){e=r+o;i=undefined;try{i=yield t.stat(e)}catch(t){if(t.code!=="ENOENT"){console.log(`Unexpected error attempting to determine if executable file exists '${e}': ${t}`)}}if(i&&i.isFile()){if(t.IS_WINDOWS){try{const n=l.dirname(e);const i=l.basename(e).toUpperCase();for(const r of yield t.readdir(n)){if(i===r.toUpperCase()){e=l.join(n,r);break}}}catch(t){console.log(`Unexpected error attempting to determine the actual case of the file '${e}': ${t}`)}return e}else{if(isUnixExecutable(i)){return e}}}}return""})}t.tryGetExecutablePath=tryGetExecutablePath;function normalizeSeparators(e){e=e||"";if(t.IS_WINDOWS){e=e.replace(/\//g,"\\");return e.replace(/\\\\+/g,"\\")}return e.replace(/\/\/+/g,"/")}function isUnixExecutable(e){return(e.mode&1)>0||(e.mode&8)>0&&e.gid===process.getgid()||(e.mode&64)>0&&e.uid===process.getuid()}function getCmdPath(){var e;return(e=process.env["COMSPEC"])!==null&&e!==void 0?e:`cmd.exe`}t.getCmdPath=getCmdPath},436:function(e,t,n){var i=this&&this.__createBinding||(Object.create?function(e,t,n,i){if(i===undefined)i=n;Object.defineProperty(e,i,{enumerable:true,get:function(){return t[n]}})}:function(e,t,n,i){if(i===undefined)i=n;e[i]=t[n]});var r=this&&this.__setModuleDefault||(Object.create?function(e,t){Object.defineProperty(e,"default",{enumerable:true,value:t})}:function(e,t){e["default"]=t});var o=this&&this.__importStar||function(e){if(e&&e.__esModule)return e;var t={};if(e!=null)for(var n in e)if(n!=="default"&&Object.hasOwnProperty.call(e,n))i(t,e,n);r(t,e);return t};var s=this&&this.__awaiter||function(e,t,n,i){function adopt(e){return e instanceof n?e:new n(function(t){t(e)})}return new(n||(n=Promise))(function(n,r){function fulfilled(e){try{step(i.next(e))}catch(e){r(e)}}function rejected(e){try{step(i["throw"](e))}catch(e){r(e)}}function step(e){e.done?n(e.value):adopt(e.value).then(fulfilled,rejected)}step((i=i.apply(e,t||[])).next())})};Object.defineProperty(t,"__esModule",{value:true});t.findInPath=t.which=t.mkdirP=t.rmRF=t.mv=t.cp=void 0;const u=n(357);const c=o(n(129));const l=o(n(622));const f=n(669);const a=o(n(962));const d=f.promisify(c.exec);const p=f.promisify(c.execFile);function cp(e,t,n={}){return s(this,void 0,void 0,function*(){const{force:i,recursive:r,copySourceDirectory:o}=readCopyOptions(n);const s=(yield a.exists(t))?yield a.stat(t):null;if(s&&s.isFile()&&!i){return}const u=s&&s.isDirectory()&&o?l.join(t,l.basename(e)):t;if(!(yield a.exists(e))){throw new Error(`no such file or directory: ${e}`)}const c=yield a.stat(e);if(c.isDirectory()){if(!r){throw new Error(`Failed to copy. ${e} is a directory, but tried to copy without recursive flag.`)}else{yield cpDirRecursive(e,u,0,i)}}else{if(l.relative(e,u)===""){throw new Error(`'${u}' and '${e}' are the same file`)}yield copyFile(e,u,i)}})}t.cp=cp;function mv(e,t,n={}){return s(this,void 0,void 0,function*(){if(yield a.exists(t)){let i=true;if(yield a.isDirectory(t)){t=l.join(t,l.basename(e));i=yield a.exists(t)}if(i){if(n.force==null||n.force){yield rmRF(t)}else{throw new Error("Destination already exists")}}}yield mkdirP(l.dirname(t));yield a.rename(e,t)})}t.mv=mv;function rmRF(e){return s(this,void 0,void 0,function*(){if(a.IS_WINDOWS){if(/[*"<>|]/.test(e)){throw new Error('File path must not contain `*`, `"`, `<`, `>` or `|` on Windows')}try{const t=a.getCmdPath();if(yield a.isDirectory(e,true)){yield d(`${t} /s /c "rd /s /q "%inputPath%""`,{env:{inputPath:e}})}else{yield d(`${t} /s /c "del /f /a "%inputPath%""`,{env:{inputPath:e}})}}catch(e){if(e.code!=="ENOENT")throw e}try{yield a.unlink(e)}catch(e){if(e.code!=="ENOENT")throw e}}else{let t=false;try{t=yield a.isDirectory(e)}catch(e){if(e.code!=="ENOENT")throw e;return}if(t){yield p(`rm`,[`-rf`,`${e}`])}else{yield a.unlink(e)}}})}t.rmRF=rmRF;function mkdirP(e){return s(this,void 0,void 0,function*(){u.ok(e,"a path argument must be provided");yield a.mkdir(e,{recursive:true})})}t.mkdirP=mkdirP;function which(e,t){return s(this,void 0,void 0,function*(){if(!e){throw new Error("parameter 'tool' is required")}if(t){const t=yield which(e,false);if(!t){if(a.IS_WINDOWS){throw new Error(`Unable to locate executable file: ${e}. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also verify the file has a valid extension for an executable file.`)}else{throw new Error(`Unable to locate executable file: ${e}. Please verify either the file path exists or the file can be found within a directory specified by the PATH environment variable. Also check the file mode to verify the file is executable.`)}}return t}const n=yield findInPath(e);if(n&&n.length>0){return n[0]}return""})}t.which=which;function findInPath(e){return s(this,void 0,void 0,function*(){if(!e){throw new Error("parameter 'tool' is required")}const t=[];if(a.IS_WINDOWS&&process.env["PATHEXT"]){for(const e of process.env["PATHEXT"].split(l.delimiter)){if(e){t.push(e)}}}if(a.isRooted(e)){const n=yield a.tryGetExecutablePath(e,t);if(n){return[n]}return[]}if(e.includes(l.sep)){return[]}const n=[];if(process.env.PATH){for(const e of process.env.PATH.split(l.delimiter)){if(e){n.push(e)}}}const i=[];for(const r of n){const n=yield a.tryGetExecutablePath(l.join(r,e),t);if(n){i.push(n)}}return i})}t.findInPath=findInPath;function readCopyOptions(e){const t=e.force==null?true:e.force;const n=Boolean(e.recursive);const i=e.copySourceDirectory==null?true:Boolean(e.copySourceDirectory);return{force:t,recursive:n,copySourceDirectory:i}}function cpDirRecursive(e,t,n,i){return s(this,void 0,void 0,function*(){if(n>=255)return;n++;yield mkdirP(t);const r=yield a.readdir(e);for(const o of r){const r=`${e}/${o}`;const s=`${t}/${o}`;const u=yield a.lstat(r);if(u.isDirectory()){yield cpDirRecursive(r,s,n,i)}else{yield copyFile(r,s,i)}}yield a.chmod(t,(yield a.stat(e)).mode)})}function copyFile(e,t,n){return s(this,void 0,void 0,function*(){if((yield a.lstat(e)).isSymbolicLink()){try{yield a.lstat(t);yield a.unlink(t)}catch(e){if(e.code==="EPERM"){yield a.chmod(t,"0666");yield a.unlink(t)}}const n=yield a.readlink(e);yield a.symlink(n,t,a.IS_WINDOWS?"junction":null)}else if(!(yield a.exists(t))||n){yield a.copyFile(e,t)}})}},978:(e,t,n)=>{Object.defineProperty(t,"__esModule",{value:true});const i=n(747);const r=n(874);var o;(function(e){async function configSet(e,t){const n=[r.default.Commands.Config,r.default.SubCommands.set,e,t];await r.default.exec(n)}e.configSet=configSet;async function auth(e){const t=r.default.getOptions({"snyk-token":e});const n=[r.default.Commands.Auth,...t];const i=await r.default.exec(n,{hideOutput:true});return i.stdout}e.auth=auth;async function analyse(e,t){const n=r.default.getOptions({json:"",verbose:"",client:"gh-actions"});const o=[r.default.Commands.Analyse,e,...n];const s=await r.default.exec(o,{ignoreReturnCode:true,hideOutput:true});const u=s.stdout;i.writeFileSync(t,u,"utf8")}e.analyse=analyse})(o||(o={}));t.default=o},412:(e,t,n)=>{Object.defineProperty(t,"__esModule",{value:true});const i=n(413);class CmdOutputHider extends i.Writable{constructor(e,t){super();this.outStream=e;this.outContents=t;this.hasEchoedCmdLine=false}write(e){if(!this.hasEchoedCmdLine){this.outStream.write(e);if(e.toString().includes("\n")){this.hasEchoedCmdLine=true;this.outStream.write(`*** Suppressing command output\n`)}}else{this.outContents+=e.toString()}return false}getContents(){return this.outContents}}t.default=CmdOutputHider},260:(e,t,n)=>{Object.defineProperty(t,"__esModule",{value:true});t.convert=void 0;const i=n(747);const r=n(186);const o={version:"2.1.0",runs:[{originalUriBaseIds:{PROJECTROOT:{uri:"file:///github/workspace/",description:{text:"The root directory for all project files."}}},tool:{driver:{name:"CRDA",rules:[]}},results:[]}]};const s="output.sarif";function srules(e,t){if(t){e.runs[0].tool.driver.rules=t}return e.runs[0].tool.driver.rules}function sresults(e,t){if(t){e.runs[0].results=t}return e.runs[0].results}function crdaToRule(e){const t=e.id;const n={text:e.title};const i={text:e.title};const r={text:"text for help",markdown:"markdown ***text for help"};let o="none";if(e.severity==="medium")o="warning";if(e.severity==="high")o="error";if(e.severity==="critical")o="error";const s={level:o};const u={tags:[]};const c={id:t,shortDescription:n,fullDescription:i,help:r,defaultConfiguration:s,properties:u};return c}function crdaToResult(e,t){if(e.publicly_available_vulnerabilities!=null){const n=i.readFileSync(t,"utf-8");const o=n.split(/\r\n|\n/);const s=o.findIndex(t=>{return t.includes(e.name)});const u=e.publicly_available_vulnerabilities[0].id;const c={text:e.publicly_available_vulnerabilities[0].title};const l={uri:t,uriBaseId:"PROJECTROOT"};const f={startLine:s+1};const a={artifactLocation:l,region:f};const d={physicalLocation:a};const p={ruleId:u,message:c,locations:[d]};r.info("Result generated");r.info(JSON.stringify(p));return p}r.info("Hello2");return undefined}function getSarif(e,t){r.info(`Initial rules: ${JSON.stringify(o.runs[0].tool.driver.rules)}`);r.info(`Initial results: ${JSON.stringify(o.runs[0].results)}`);const n=JSON.parse(e);const i=[];if(n.severity.low){n.severity.low.forEach(e=>{i.push(crdaToRule(e))})}if(n.severity.medium){n.severity.medium.forEach(e=>{i.push(crdaToRule(e))})}if(n.severity.high){n.severity.high.forEach(e=>{i.push(crdaToRule(e))})}if(n.severity.critical){n.severity.critical.forEach(e=>{i.push(crdaToRule(e))})}r.info(`Number of rules combined is: ${i.length}`);srules(o,i);const s=[];n.analysed_dependencies.forEach(e=>{r.info("hello1");const n=crdaToResult(e,t);if(n){s.push(n)}});r.info(`Number of results combined is: ${s.length}`);sresults(o,s);r.info(JSON.stringify(o.runs[0].results));return o}function convert(e,t){const n=i.readFileSync(e,"utf-8");const r=getSarif(n,t);writeJSON(s,r)}t.convert=convert;function writeJSON(e,t){const n=i.createWriteStream(e);n.once("open",()=>{n.write(JSON.stringify(t));n.end();r.info(`Created: ${e}`)})}},874:(e,t,n)=>{Object.defineProperty(t,"__esModule",{value:true});const i=n(87);const r=n(514);const o=n(186);const s=n(314);const u=n(412);const c=s.getOS()==="windows"?"crda.exe":"crda";var l;(function(e){let t;(function(e){e["Auth"]="auth";e["Analyse"]="analyse";e["Config"]="config"})(t=e.Commands||(e.Commands={}));let n;(function(e){e["set"]="set"})(n=e.SubCommands||(e.SubCommands={}));let s;(function(e){e["CrdaKey"]="crda_key";e["ConsentTelemetry"]="consent_telemetry"})(s=e.ConfigKeys||(e.ConfigKeys={}));let l;(function(e){e["SnykToken"]="snyk-token";e["Json"]="json";e["Verbose"]="verbose";e["Client"]="client"})(l=e.Flags||(e.Flags={}));function getOptions(e){return Object.entries(e).reduce((e,t)=>{const[n,i]=t;if(i==null){return e}let r="--"+n;if(i!==""){r+=`=${i}`}e.push(r);return e},[])}e.getOptions=getOptions;async function exec(e,t={}){let n="";let s="";const l={...t};if(t.hideOutput){const e=t.outStream||process.stdout;l.outStream=new u.default(e,n)}l.ignoreReturnCode=true;l.listeners={stdline:e=>{n+=e+i.EOL},errline:e=>{s+=e+i.EOL}};if(t.group){const t=[c,...e].join(" ");o.startGroup(t)}try{const i=await r.exec(c,e,l);if(t.ignoreReturnCode!==true&&i!==0){let e=`crda exited with code ${i}`;if(s){e+=`\n${s}`}throw new Error(e)}if(l.outStream instanceof u.default){n=l.outStream.getContents()}return{exitCode:i,stdout:n,stderr:s}}finally{if(t.group){o.endGroup()}}}e.exec=exec})(l||(l={}));t.default=l},69:(e,t)=>{Object.defineProperty(t,"__esModule",{value:true});t.Outputs=t.Inputs=void 0;var n;(function(e){e["ANALYSIS_REPORT_FILE_NAME"]="analysis_report_file_name";e["CONSENT_TELEMETRY"]="consent_telemetry";e["CRDA_KEY"]="crda_key";e["MANIFEST_FILE_PATH"]="manifest_file_path";e["PKG_INSTALLATION_DIRECTORY_PATH"]="pkg_installation_directory_path";e["SNYK_TOKEN"]="snyk_token"})(n=t.Inputs||(t.Inputs={}));var i;(function(e){e["CRDA_KEY"]="crda_key"})(i=t.Outputs||(t.Outputs={}))},144:(e,t,n)=>{Object.defineProperty(t,"__esModule",{value:true});const i=n(186);const r=n(69);const o=n(314);const s=n(978);const u=n(874);const c=n(260);async function run(){i.debug(`Runner OS is ${o.getOS()}`);i.debug(`Node version is ${process.version}`);const e=i.getInput(r.Inputs.MANIFEST_FILE_PATH);const t=i.getInput(r.Inputs.SNYK_TOKEN);const n=i.getInput(r.Inputs.CRDA_KEY);const l=i.getInput(r.Inputs.CONSENT_TELEMETRY)||"true";const f=i.getInput(r.Inputs.ANALYSIS_REPORT_FILE_NAME)||"crda_analysis_report.json";const a=i.getInput(r.Inputs.PKG_INSTALLATION_DIRECTORY_PATH);if(a){i.info(`Setting up the PYTHONPATH to ${a}`);process.env.PYTHONPATH=a}i.info(`Setting up the ${u.default.ConfigKeys.ConsentTelemetry} to ${l}`);await s.default.configSet(u.default.ConfigKeys.ConsentTelemetry,l);if(t){i.info(`⏳ Authenticating with the provided Snyk Token`);const e=await s.default.auth(t);const n=e.split("\n");const o=n[2].split(":")[1];i.setSecret(o);i.info(e);i.info(`✅ Generated CRDA key is stored in the output ${r.Outputs.CRDA_KEY}.`);i.setOutput(r.Outputs.CRDA_KEY,o)}else if(n){i.info(`Setting up the ${u.default.ConfigKeys.CrdaKey} with the provided value.`);await s.default.configSet(u.default.ConfigKeys.CrdaKey,n)}else{throw new Error(`❌ Input ${r.Inputs.CRDA_KEY} or ${r.Inputs.SNYK_TOKEN} must be provided.`)}i.info(`⏳ Analysing your Dependency Stack! Please wait...`);await s.default.analyse(e,f);i.info(`✅ Analysis completed. Analysis report is available at ${f}`);c.convert(f,e)}run().then(()=>{i.info("Success.")}).catch(e=>{i.setFailed(e.message)})},314:(e,t,n)=>{Object.defineProperty(t,"__esModule",{value:true});t.getOS=void 0;const i=n(186);let r;function getOS(){if(r==null){const e=process.platform;if(e==="win32"){r="windows"}else if(e==="darwin"){r="macos"}else if(e!=="linux"){i.warning(`Unrecognized OS "${e}"`);r="linux"}else{r="linux"}}return r}t.getOS=getOS},357:e=>{e.exports=require("assert")},129:e=>{e.exports=require("child_process")},614:e=>{e.exports=require("events")},747:e=>{e.exports=require("fs")},87:e=>{e.exports=require("os")},622:e=>{e.exports=require("path")},413:e=>{e.exports=require("stream")},304:e=>{e.exports=require("string_decoder")},213:e=>{e.exports=require("timers")},669:e=>{e.exports=require("util")}};var t={};function __webpack_require__(n){if(t[n]){return t[n].exports}var i=t[n]={exports:{}};var r=true;try{e[n].call(i.exports,i,i.exports,__webpack_require__);r=false}finally{if(r)delete t[n]}return i.exports}__webpack_require__.ab=__dirname+"/";return __webpack_require__(144)})();
//# sourceMappingURL=index.js.map