//@flow
import { User } from "oidc-client";
import { Effect, put } from 'redux-saga/effects';

const SET_USER = "SET_USER";

const defaultState = {
    user: null,
  };

export type UserState = {
    user: ?User;
}

type SetUserAction = {type: "SET_USER", user: ?User};

export const setUser = (user: ?User): SetUserAction => {
    return {type: SET_USER, user}
}

type Actions = SetUserAction;

export function oidcReducer(state: UserState = defaultState, action: Actions = {}) {
    switch (action.type) {
        case SET_USER: 
           return {
            ...state,
            user: action.user,
          };
    
        default:
          return state;
    }
}

export function* logOut(): Generator<Effect, void, string> {
    yield put(setUser());
}
