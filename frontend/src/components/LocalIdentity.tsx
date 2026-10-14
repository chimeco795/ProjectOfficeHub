import {sessionValue,useSession} from './authState';
export {AccountMenu as LocalIdentity} from './Session';
export const localPersonId = () => sessionValue()?.account.person_id || '';
export function useLocalPersonId(){return useSession()?.account.person_id||'';}
