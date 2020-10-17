import 'bootstrap/dist/css/bootstrap.min.css'

import '../css/main.css'

import './icons'
import './check-updates'
import { prepareInputs, setReleaseDateTime } from './form-util'
import { warnFacebookBrowserUserIfNecessary } from './facebook-util'
import { addVersion } from './util'

setReleaseDateTime()
warnFacebookBrowserUserIfNecessary()
prepareInputs()
addVersion()
