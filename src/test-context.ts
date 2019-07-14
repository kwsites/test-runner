import { deepEqual, equal, notEqual, notStrictEqual, ok, strictEqual } from 'assert';

export class TestContext {

   constructor(
      private _pass: () => void,
      private _fail: (err: Error) => void
   ) {
   }

   ok(thing: any, message?: string) {
      ok(thing, message);
   }

   equal(left: any, right: any, message?: string) {
      equal(left, right, message);
   }

   equals(left: any, right: any, message?: string) {
      equal(left, right, message);
   }

   deepEqual(left: any, right: any, message?: string) {
      deepEqual(left, right, message);
   }

   notEqual(left: any, right: any, message?: string) {
      notEqual(left, right, message);
   }

   same(left: any, right: any, message?: string) {
      deepEqual(left, right, message);
   }

   throws(callback: () => void) {
      let isErr;
      try {
         callback();
      }
      catch (e) {
         isErr = e;
      }

      notStrictEqual(isErr, undefined);
   }

   doesNotThrow(callback: () => void) {
      let isErr;
      try {
         callback();
      }
      catch (e) {
         isErr = e;
      }

      strictEqual(isErr, undefined);
   }

   done(err?: Error) {
      if (err) {
         return this._fail(err);
      }

      this._pass();
   }
}
