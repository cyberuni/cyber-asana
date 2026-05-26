# Jenkins release template

Config file: `Jenkinsfile`

See [\_common.md](./_common.md) for the shared version/commit/publish pattern.

```groovy
pipeline {
  agent any
  triggers { pollSCM('H/5 * * * *') }
  stages {
    stage('Release') {
      when { branch 'main' }
      steps {
        sh '<install-command>'
        sh '<build-command>'   // remove if no build
        sh '<pm> run version'
        sh 'git config user.email "ci@bot" && git config user.name "CI Bot"'
        sh 'git add . && git commit -m "chore: version packages" || true'
        sh 'git push || true'
        withCredentials([string(credentialsId: 'NPM_TOKEN', variable: 'NPM_TOKEN')]) {
          sh '<pm> run release'
        }
      }
    }
  }
}
```

Secrets: `NPM_TOKEN` via **Manage Jenkins → Credentials** as a secret text credential.
