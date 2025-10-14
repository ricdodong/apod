// server/firebird-example.js
// Example: insert now-playing record into Firebird

const Firebird = require('node-firebird');
const options = {
  host: '127.0.0.1',
  port: 3050,
  database: '/path/to/ricalgen.fdb',
  user: 'SYSDBA',
  password: 'masterkey',
  role: null,
  pageSize: 4096
};

function insertNowPlaying(title, artist) {
  Firebird.attach(options, function(err, db) {
    if (err) throw err;
    const sql = 'INSERT INTO now_playing_history (played_at, title, artist) VALUES (CURRENT_TIMESTAMP, ?, ?)';
    db.query(sql, [title, artist], function(err) {
      if (err) console.error(err);
      db.detach();
    });
  });
}

module.exports = { insertNowPlaying };