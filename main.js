var 
    GitHubApi = require('github')
  , read      = require('read')
  ;

//  die :: String -> IO ()
var die = function(msg) {
  console.error("Error in request to Github: " + JSON.parse(msg.message).message);
  process.exit(1);
}

var github = new GitHubApi({
    version: "3.0.0",
    protocol: "https",
    host: "api.github.com",
    timeout: 5000,
    headers: {
        "user-agent": "gh-stats"
    }
});

read({ prompt: 'Username: ' }, function(err, usr) {
  if(err) die(err);
  read({ prompt: 'Password:', silent: true }, function(err, pass) {
    if(err) die(err);

    github.authenticate({
      type: "basic",
      username: usr,
      password: pass
    });

    github.repos.getAll({
      user: "hellerve"
    }, function(err, res) {
      if(err) die(err);

      console.log("Number of Repos: " + res.length);

      var commitSum = 0;
      var worker = 0;
      res.forEach(function(repo) {
        worker += 1;
        github.repos.getCommits({
          user: "hellerve",
          repo: repo.name
        }, function(err, res) {
          worker -= 1;

          if(err) console.error("[Fetching commits] Repo does not exist anymore: " + repo.name);
          else commitSum += res.length;

          if(worker == 0) console.log("Number of Commits in own repos: " + commitSum);
        });
      });
        
    });

    github.user.getOrgs({
      user: 'hellerve'
    }, function(err, res) {
      if(err) die(err);

      console.log("Number of Organizations: " + res.length);
      console.log("Organization name(s):" + res.reduce(function(acc, el) { return acc += "\n\t" + el.login; }, ""));
    });

  });
});
