var express = require('express');
var router = express.Router();

const { tortoiseDB } = require('../../db/tortoiseDB');

const debug = require('debug');
var log = debug('tortoiseDB:syncFrom');
var logFrom = debug('tortoiseDB:syncFromSummary');

router.post('/_last_tortoise_key', (req, res) => {
  // Initialize new replicateFrom object
  tortoiseDB.syncFrom();
  logFrom('\n\n ------- NEW Turtle ==> Tortoise SYNC ------');
  log('\n #1 HTTP POST request <== Turtle requesting checkpoint from last sync session');

  // Then begin replication process
  tortoiseDB.syncFromSession.getLastTortoiseKey(req.body)
  .then(lastKey => {
    log(`\n Get last Turtle key (${lastKey}) from previous sync session`);
    log('\n #2 HTTP response ==> Turtle with last key');
    res.send(lastKey.toString())
  })
  .catch(err => console.log("_last_tortoise_key error:", err))
});

router.post('/_missing_rev_ids', (req, res) => {
  log(`\n #3 HTTP POST request <== Turtle with (${req.body.metaDocs.length}) changed revision trees`);
  tortoiseDB.syncFromSession.dummyFindAllMissingLeafNodes(req.body.metaDocs)
    .then(missingRevIds => {
      //log('\n Merge revision trees and list all missing records');
      log(`\n #4 HTTP response ==> Turtle requesting (${missingRevIds.length}) missing records`);
      res.send(missingRevIds)
    })
    .catch(err => console.log("_missing_rev_ids route error:", err));
});

router.post('/_insert_docs', (req, res) => {
  log('\n #5 HTTP POST request <== Turtle with missing records and updated sync history');
  tortoiseDB.syncFromSession.insertNewDocsIntoStore(req.body.docs)
  .then(() => log('\n Insert missing records into MongoDB'))
  .then(() => tortoiseDB.syncFromSession.updateSyncFromTurtleDoc(req.body.newSyncToTortoiseDoc))
  .then(() => log('\n Update sync history doc'))
  .then(() => log('\n #6 HTTP response ==> Turtle with confirmation of complete sync'))
  .then(() => res.send("Insert docs received"))
  .then(() => logFrom('\n ------- Turtle ==> Tortoise sync complete ------ '))
  .catch(err => console.log("_insert_docs error:", err));
});

module.exports = router;
