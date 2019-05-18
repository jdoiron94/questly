/* eslint-disable no-unused-vars */
import React, { useState } from 'react'
import hiscores from 'osrs-json-hiscores'

import './App.css'

function App () {
  const [name, setName] = useState('Questly')
  const [username, setUsername] = useState(null)
  const [url] = useState('http://services.runescape.com/m=hiscore_oldschool/index_lite.ws?player=')

  return (
    <div className="App">
      <nav className="uk-navbar-container uk-margin" data-uk-navbar>
        <div className="uk-navbar-left">
          <a className="uk-navbar-item uk-logo" href="#">Questly</a>
          <div className="uk-navbar-item">
            <input className="uk-input uk-form-width-medium" type="text" placeholder="Username" onChange={e => setUsername(e.target.value)}/>
          </div>
          <div className="uk-navbar-item">
            <button className="uk-button uk-button-default" onClick={query}>Submit</button>
          </div>
        </div>
      </nav>
    </div>
  )

  function query () {
    const safeUsername = encodeURIComponent(username)
    const fullUrl = `https://cors-anywhere.herokuapp.com/${url}${safeUsername}`
    console.log(fullUrl)
    fetch(fullUrl)
      .then(res => console.log(res))
      .catch(err => console.error(err))
  }
}

export default App
