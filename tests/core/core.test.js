const chai = require('chai');
chai.use(require('sinon-chai'));
const { expect } = chai;

const nock = require('nock');

const testApiKey = 'test-api-key';
const testConfig = require('../../lib/config')(testApiKey);
const sinon = require('sinon');
const rewire = require('rewire');
const { errors } = require('../../lib/utils');
const core = rewire('../../lib/core');

const encryptStub = sinon.stub();
core.__set__({
  Crypto: () => ({
    encrypt: encryptStub,
  }),
});
const cageName = 'test-cage',
  testData = { a: 1 };
const testCageKey = 'im-the-cage-key';

describe('Core exports', () => {
  context('Given a valid config', () => {
    it('returns the expected object', () => {
      const sdk = core(testConfig);
      expect(sdk.encrypt).to.be.a('function');
      expect(sdk.run).to.be.a('function');
      expect(sdk.encryptAndRun).to.be.a('function');
    });
  });

  context('Invoking returned encrypt', () => {
    afterEach(() => {
      encryptStub.reset();
    });

    context('getCageKey fails', () => {
      let cageKeyNock;
      before(() => {
        cageKeyNock = nock(testConfig.http.baseUrl, {
          reqheaders: {
            'API-KEY': testApiKey,
          },
        })
          .get('/cages/key')
          .reply(401, { errorMesage: 'error retrieving cage key' });
      });

      it('Throws an error', () => {
        const { encrypt } = core(testConfig);
        return encrypt(cageName, testData).catch((err) => {
          expect(cageKeyNock.isDone()).to.be.true;
          expect(err).to.be.instanceOf(errors.ApiKeyError);
          expect(encryptStub).to.not.have.been.called;
        });
      });
    });

    context('getCageKey succeeds', () => {
      let cageKeyNock;
      beforeEach(() => {
        cageKeyNock = nock(testConfig.http.baseUrl, {
          reqheaders: {
            'API-KEY': testApiKey,
          },
        })
          .get('/cages/key')
          .reply(200, { key: testCageKey });
        encryptStub.resolves(true);
      });

      it('Calls encrypt with the returned key', () => {
        const { encrypt } = core(testConfig);
        return encrypt(cageName, testData).then(() => {
          expect(cageKeyNock.isDone()).to.be.true;
          expect(encryptStub).to.have.been.calledWith(
            cageName,
            testCageKey,
            testData,
            {}
          );
        });
      });
    });

    context('multiple encrypt calls', () => {
      const httpStub = sinon.stub();
      const getCageKeyStub = sinon.stub();

      before(() => {
        getCageKeyStub.resolves({ key: testCageKey });
        httpStub.returns({ getCageKey: getCageKeyStub });
        encryptStub.resolves(true);
        core.__set__({
          Http: httpStub,
        });
      });

      it('Only requests the key once', async () => {
        const { encrypt } = core(testConfig);
        await encrypt(cageName, testData);

        return encrypt(cageName, testData).then(() => {
          expect(httpStub).to.have.been.calledOnce;
          expect(getCageKeyStub).to.have.been.calledOnce;
          expect(encryptStub).to.always.have.been.calledWith(
            cageName,
            testCageKey,
            testData,
            {}
          );
        });
      });
    });
  });

  context('Invoking encryptAndRun', () => {
    const httpStub = sinon.stub();
    const getCageKeyStub = sinon.stub();
    const runCageStub = sinon.stub();
    const testEncryptResult = true;

    beforeEach(() => {
      getCageKeyStub.resolves({ key: testCageKey });
      runCageStub.resolves({ result: true });
      httpStub.returns({ getCageKey: getCageKeyStub, runCage: runCageStub });
      encryptStub.resolves(testEncryptResult);
      core.__set__({
        Http: httpStub,
      });
    });

    afterEach(() => {
      getCageKeyStub.resetHistory();
      runCageStub.resetHistory();
      encryptStub.resetHistory();
    });

    context('First encryption call to sdk', () => {
      it('Calls getCageKey, encrypts the data and runs the cage', () => {
        const { encryptAndRun } = core(testConfig);

        return encryptAndRun(cageName, testData).then(() => {
          expect(getCageKeyStub).to.have.been.calledOnce;
          expect(encryptStub).to.have.been.calledOnceWith(
            cageName,
            testCageKey,
            testData,
            {}
          );
          expect(runCageStub).to.have.been.calledOnceWith(
            cageName,
            testEncryptResult
          );
        });
      });
    });
  });
});
