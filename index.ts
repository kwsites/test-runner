import { TestContext } from './util/test-context';

const TIMEOUT = 2000;

export type Test = (test: TestContext) => void;

export type TestWrapper = (done: () => void) => void;

export interface TestSuite {
   [groupsAndTests: string]: TestSuite | Test | TestWrapper;

   setUp: TestWrapper;
   tearDown: TestWrapper;
}

export interface CompiledTest {
   hierarchy: TestSuite[];
   name: string;
   test: Test;
}

function isWrapperFunction(name: string): boolean {
   return /^(setUp|tearDown)$/.test(name);
}

function getSuiteGroups (suite: TestSuite): TestSuite[] {
   return Object.keys(suite)
      .filter(name => !isWrapperFunction(name) && isObject(suite[name]))
      .map(name => suite[name] as TestSuite);
}

function getSuiteTests (suite: TestSuite, hierarchy: TestSuite[]): CompiledTest[] {
   return Object.keys(suite)
      .filter(name => !isWrapperFunction(name) && isFunction(suite[name]))
      .map(name => ({ name, test: suite[name] as Test, hierarchy: [...hierarchy]}));
}

function isObject(thing: any): boolean {
   return !!thing && typeof thing === 'object';
}

function isFunction(thing: any): boolean {
   return typeof thing === 'function';
}

function runTestWrapper (name: string, wrapperFn: TestWrapper): Promise<void> {
   return new Promise((done, fail) => {
      if (typeof wrapperFn !== 'function') {
         return done();
      }

      wrapperFn(() => {
         done()
      });

      setTimeout(() => fail(new Error(`${name} failed to complete within timeout of ${TIMEOUT}ms`)), TIMEOUT);
   });
}

function runTest (name: string, test: Test): Promise<void> {
   return new Promise((done, fail) => {
      test(new TestContext(done, fail));

      setTimeout(() => fail(new Error(`${name} failed to complete within timeout of ${TIMEOUT}ms`)), TIMEOUT);
   });
}

async function runCompiledTest (compiledTest: CompiledTest): Promise<boolean> {
   let success = true;
   await compiledTest.hierarchy.reduce(
      (chain, suite) => chain.then(() => runTestWrapper('setUp', suite.setUp)), Promise.resolve());

   try {
      await runTest(compiledTest.name, compiledTest.test);
      console.log(`   [PASS] ${ compiledTest.name }`);
   }
   catch (e) {
      success = false;
      console.warn(`   [FAIL] ${ compiledTest.name }`);
      console.error(e);
   }

   await compiledTest.hierarchy.reduce(
      (chain, suite) => chain.then(() => runTestWrapper('tearDown', suite.tearDown)), Promise.resolve());

   return success;
}

function generateTests (suite: TestSuite, hierarchy: TestSuite[] = []): CompiledTest[] {
   hierarchy.push(suite);

   const allTests: CompiledTest[] = getSuiteTests(suite, hierarchy);

   getSuiteGroups(suite).forEach(group => allTests.push( ...generateTests(group, hierarchy) ));

   hierarchy.pop();

   return allTests;
}

export function run (files: string[]) {

   console.log(files);

   const path = require('path');

   const results: boolean[] = [];

   function collectResults (chain: Promise<any>, test: CompiledTest): Promise<any> {
      return chain.then(() => runCompiledTest(test))
         .then((result: boolean) => results.push(result))
   }

   function collectTests (chain: Promise<any>, file: string): Promise<any> {
      return chain.then(() => {
         console.log(`[TEST] ${ file }`);

         return generateTests(require(path.resolve(file)))
            .reduce(collectResults, Promise.resolve())
            .then(() => console.log('\n'));
      });
   }

   const suites: Promise<void> = files.reduce(collectTests, Promise.resolve());

   suites.then(() => Promise.all(results).then(r => {

      const PASS = 1, FAIL = 0;
      const data = r.reduce((a, success) => { a[+success]++; return a; }, [0, 0]);

      console.log(`PASS ${ data[PASS] } FAIL ${ data[FAIL] }`);

      if (data[FAIL]) {
         throw new Error(`Errors in ${ data[FAIL] } tests`);
      }

   }));

}
