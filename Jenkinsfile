// Local Jenkins pipeline: quality gate -> Chromium regression -> optional
// BrowserStack cross-browser pass. Mirrors .github/workflows/playwright.yml.
//
// One-time setup: a "nodejs" NodeJS tool installation (Manage Jenkins >
// Tools), and a Username/Password credential holding your BrowserStack
// username + access key, ID = BROWSERSTACK_CREDENTIALS_ID below (Manage
// Jenkins > Credentials). Then create a Pipeline job, script path
// "Jenkinsfile" — no trigger is hardcoded, so wire it to a webhook,
// pollSCM, or a manual build as you prefer.

pipeline {
  agent any

  options {
    timestamps()
    timeout(time: 45, unit: 'MINUTES')
    disableConcurrentBuilds()
  }

  parameters {
    choice(
      name: 'TEST_SCOPE',
      choices: ['regression', 'smoke', 'ui', 'api', 'performance', 'all'],
      description: 'Which npm test:* script the local Chromium stage runs.',
    )
    booleanParam(
      name: 'RUN_BROWSERSTACK',
      defaultValue: false,
      description: 'Also run the UI suite cross-browser on BrowserStack (needs the credential below).',
    )
  }

  environment {
    CI = 'true'
    WORKERS = '2'
    NODE_TOOL = 'nodejs'
    BROWSERSTACK_CREDENTIALS_ID = 'browserstack-creds'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install') {
      steps {
        script {
          env.NODE_HOME = tool(env.NODE_TOOL)
          env.PATH = "${env.NODE_HOME}/bin:${env.PATH}"
        }
        sh 'node --version && npm --version'
        sh 'npm ci'
      }
    }

    stage('Quality gate') {
      steps {
        sh 'npm run typecheck'
        sh 'npm run lint'
      }
    }

    stage('Install browsers') {
      steps {
        sh 'npx playwright install --with-deps'
      }
    }

    stage('Local regression (Chromium)') {
      steps {
        script {
          def scopeToScript = [
            regression : 'npm run test:regression -- --project=chromium',
            smoke      : 'npm run test:smoke -- --project=chromium',
            ui         : 'npm run test:ui -- --project=chromium',
            api        : 'npm run test:api -- --project=chromium',
            performance: 'npm run test:performance -- --project=chromium',
            all        : 'npm test -- --project=chromium',
          ]
          sh scopeToScript[params.TEST_SCOPE]
        }
      }
      post {
        always {
          junit testResults: 'test-results/junit.xml', allowEmptyResults: true
          archiveArtifacts artifacts: 'playwright-report/**, test-results/**', allowEmptyArchive: true, fingerprint: false
        }
      }
    }

    stage('BrowserStack cross-browser') {
      when {
        expression { return params.RUN_BROWSERSTACK }
      }
      steps {
        withCredentials([usernamePassword(
          credentialsId: env.BROWSERSTACK_CREDENTIALS_ID,
          usernameVariable: 'BROWSERSTACK_USERNAME',
          passwordVariable: 'BROWSERSTACK_ACCESS_KEY',
        )]) {
          sh 'BROWSERSTACK_BUILD_NAME="jenkins-${JOB_NAME}-${BUILD_NUMBER}" npm run test:browserstack'
        }
      }
      post {
        always {
          junit testResults: 'test-results/junit-browserstack.xml', allowEmptyResults: true
          archiveArtifacts artifacts: 'playwright-report-browserstack/**', allowEmptyArchive: true, fingerprint: false
        }
      }
    }
  }

  post {
    always {
      echo "TEST_SCOPE=${params.TEST_SCOPE} RUN_BROWSERSTACK=${params.RUN_BROWSERSTACK} — see the JUnit trend and archived HTML reports for results."
    }
    cleanup {
      cleanWs()
    }
  }
}
