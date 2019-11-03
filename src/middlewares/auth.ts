import { Context } from 'koa'
import * as jwt from 'jsonwebtoken';
import { get } from 'lodash';

import config from '../config';
import { UserClaims } from '../models';

const getUserClaims = (claims: any): UserClaims => ({
  id: get(claims, 'id', ''),
  email: get(claims, 'email', ''),
  login: get(claims, 'login', ''),
  roles: get(claims, 'roles', []),
});

const auth = (ctx: Context, next: Function) => {
  const secret = config.tokenSecret;
  let token: string = get(ctx, 'headers.authorization', '');
  token = token.replace('Bearer ', '');

  try {
    const claims = jwt.verify(token, secret);
    ctx.user = getUserClaims(claims);

    return next();
  } catch (err) {
    console.error(err);
    ctx.status = 401;
    ctx.body = { message: 'Unauthorized' };
  }
};

export default auth;