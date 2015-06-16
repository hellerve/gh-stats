#!/usr/bin/env node

var 
    GitHubApi = require('github')
  , read      = require('read')
  , config    = require('./package.json')

  , VERBOSE   = !(process.argv.indexOf('-v') == -1 && process.argv.indexOf('--verbose') == -1)
  , HELP      = !(process.argv.indexOf('-h') == -1 && process.argv.indexOf('--help') == -1)
  , ERROR     = (!(VERBOSE || HELP) && process.argv.length > 2) || process.argv.length > 3
  ;

//  instance State github
var github = new GitHubApi({
    version: '3.0.0',
    protocol: 'https',
    host: 'api.github.com',
    timeout: 5000,
    headers: {
        'user-agent': 'gh-stats'
    }
});

//  printUsage :: Number -> IO ()
var printUsage = function(ex) {
  console.log("gh-stats version " 
            + config.version
            + "\n"
            + "usage: gh-stats [(-v/--verbose)|(-h/--help)]\n\t"
            + "where: -v/--verbose = print more info\n\t"
            + "       -h/--help    = print help and exit"
            )
  process.exit(ex);
}

//  die :: String -> IO ()
var die = function(msg) {
  if (msg.message) {
    console.error(msg.code 
                + ' Error in request to Github: ' 
                + JSON.parse(msg.message).message
                );
  } else {
    console.error('Undefined error in request to Github:', msg);
  }
  process.exit(1);
}

//  authenticate -> String -> String -> IO State
var authenticate = function(usr, pass) {
  github.authenticate({
    type: 'basic',
    username: usr,
    password: pass
  });
}

//  inb4 :: IO ()
var inb4 = function() {
  if (HELP) printUsage(0);
  if (ERROR) printUsage(1);
}

//  catchErr :: (a -> b) -> String -> (c -> a -> IO a)
var catchErr = function(fun, usr) {
  return function(err, x) {
    if (err) die(err);
    return fun(x, usr);
  }
}

//  getRepos -> Object -> String -> IO ()
var getRepos = function(res, usr) {
  console.log('Number of Repos: ' + res.length);

  var commitSum = 0;
  var worker = 0;

  if (VERBOSE) {
    console.log('You are owner of the following repos: ' 
               + res.reduce(_concat.bind(undefined, 'name'), '')
               );
  }

  res.forEach(function(repo) {
    worker += 1;
    github.repos.getCommits({
      author: usr,
      user: usr,
      repo: repo.name
    }, function(err, res) {
      worker -= 1;

      if (err) console.error('[Fetching commits] Repo does not exist anymore: ' + repo.name);
      else commitSum += res.length;

      if (worker == 0) console.log('Number of Commits in own repos: ' + commitSum);
    });
  });
}

//  getOrgs -> Object -> String -> IO ()
var getOrgs = function(res, usr) {
  var _concat = function(prop, acc, el) { return acc += '\n\t' + el[prop]; };

  if (VERBOSE) {
    console.log('Number of Organizations: ' + res.length);
    console.log('Organization name(s):' 
              + res.reduce(_concat.bind(undefined, 'login'), '')
              );
  }

  res.forEach(function(org) {
    github.repos.getFromOrg({
      org: org.login
    }, catchErr(function(res) {
      if (VERBOSE) {
        console.log('Organization ' 
                   + org.login 
                   + ' maintains the following repos: ' 
                   + res.reduce(_concat.bind(undefined, 'name'), '')
                   );
      }

      var commitSum = 0;
      var worker = 0;
      res.forEach(function(repo) {
        worker += 1;
        
        github.repos.getCommits({
          author: usr,
          user: org.login,
          repo: repo.name
        }, function(err, res) {
          worker -= 1;

          if (err) console.log('[Fetching commits] Repos does not exist any more: ' + repo.name);
          else commitSum += res.length;

          if (worker == 0) {
            console.log('Number of Commits in ' 
                      + org.login 
                      + 's repos: ' 
                      + commitSum
                      );
          }
        });
      });
    }));
  });
}

//  main -> IO ()
var main = function() {
  inb4();

  read({ prompt: 'Username: ' }, function(err, usr) {
    if (err) die(err);
    read({ prompt: 'Password:', silent: true }, function(err, pass) {
      if (err) die(err);

      authenticate(usr, pass);

      github.repos.getAll({ user: usr }, catchErr(getRepos, usr));

      github.user.getOrgs({ user: usr }, catchErr(getOrgs, usr));
    });
  });
}

main();
