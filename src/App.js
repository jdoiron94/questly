/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from 'react'

import LoadingOverlay from 'react-loading-overlay'
import BarLoader from 'react-spinners/BarLoader'
import Beforeunload from 'react-beforeunload'

import './App.css'

const json = require('./quests.json')

const CORS_ANYWHERE_URL = 'https://cors-anywhere.herokuapp.com/'
const HISCORE_URL = 'http://services.runescape.com/m=hiscore_oldschool/index_lite.ws?player='

const SKILLS = [
  'Attack', 'Defence', 'Strength', 'Hitpoints', 'Ranged', 'Prayer', 'Magic', 'Cooking', 'Woodcutting', 'Fletching',
  'Fishing', 'Firemaking', 'Crafting', 'Smithing', 'Mining', 'Herblore', 'Agility', 'Thieving', 'Slayer', 'Farming',
  'Runecraft', 'Hunter', 'Construction'
]

let encodedUsername = null

function App() {
  const [username, setUsername] = useState(null)
  const [members, setMembers] = useState(true)
  const [levels, setLevels] = useState(null)
  const [completed, setCompleted] = useState([])
  const [completable, setCompletable] = useState(json.quests.slice(0))
  const [incompletable, setIncompletable] = useState([])
  const [spinnerActive, setSpinnerActive] = useState(false)

  useEffect(() => {
    if (levels !== null) {
      readFromStorage()
      updateQuests()
    }
  }, [levels])

  useEffect(() => {
    updateQuests()
  }, [members])

  return <Beforeunload onBeforeunload={saveToStorage}>
    <LoadingOverlay classNamePrefix={'spinner-'} active={spinnerActive} spinner={<BarLoader />} text="Loading your levels"
      styles={{
        // Override default spinner wrapper styles so it renders
        wrapper: {},
        content: {
          width: '200px',
          margin: 'auto'
        }
      }}>
      <div className="App">
        <div uk-sticky="sel-target: .uk-navbar-container; cls-active: uk-navbar-sticky; bottom: #transparent-sticky-navbar">
          <nav className="uk-navbar-container uk-margin" data-uk-navbar>
            <div className="uk-navbar-left">
              <a className="uk-navbar-item uk-logo" href="#">Questly</a>
              <div className="uk-navbar-item">
                <input className="uk-input uk-form-width-medium" type="text" placeholder="Username" onChange={e => setUsername(e.target.value)} />
              </div>
              <div className="uk-navbar-item">
                <button className="uk-button uk-button-primary" onClick={query}>Submit</button>
              </div>
              <div className="uk-navbar-item">
                <label>
                  <input className="uk-checkbox uk-mr-mini" type="checkbox" onClick={toggleMembers} />
                  Members
                  </label>
              </div>
            </div>
          </nav>
        </div>
        <table className="uk-table uk-table-divider">
          <thead>
            <tr>
              <th>Quest</th>
              <th>Prerequisites</th>
              <th>Level Requirements</th>
            </tr>
          </thead>
          {renderAllQuests()}
        </table>
      </div>
    </LoadingOverlay>
  </Beforeunload>

  function toggleMembers() {
    setMembers(!members)
  }

  function hasOneOf(requirement, isSkill) {
    const requirements = requirement.split(' || ')
    if (isSkill) {
      for (let req of requirements) {
        const split = req.split(' ')
        const level = parseInt(split[0])
        const skillIndex = SKILLS.indexOf(split[1])
        if (levels[skillIndex] >= level) {
          return true
        }
      }
    } else {
      for (let req of requirements) {
        if (completed.find(q => q.name === req)) {
          return true
        }
      }
    }
    return false
  }

  function hasSkillRequirements(requirements) {
    if (requirements === undefined) {
      return true
    }
    for (let skill of requirements) {
      if (skill.includes('||')) {
        return hasOneOf(skill, true)
      }
      const split = skill.split(' ')
      const level = parseInt(split[0])
      const index = SKILLS.indexOf(split[1])
      if (levels[index] < level) {
        return false
      }
    }
    return true
  }

  function hasQuestRequirements(requirements) {
    if (requirements === undefined) {
      return true
    }
    for (let quest of requirements) {
      if (quest.includes('||')) {
        return hasOneOf(quest)
      }
      if (!completed.find(q => q.name === quest)) {
        return false
      }
    }
    return true
  }

  function hasQuestEligibility(requirement) {
    return requirement === undefined || requirement === members
  }

  function canCompleteQuest(quest) {
    if (hasQuestEligibility(quest.requirements.members)) {
      const hasSkills = hasSkillRequirements(quest.requirements.skills)
      const hasQuests = hasQuestRequirements(quest.requirements.quests)
      return hasSkills && hasQuests
    }
    return false
  }

  function updateQuests() {
    if (levels !== null) {
      const completable = []
      const incompletable = []
      for (let quest of json.quests) {
        if (!completed.find(q => q.name === quest.name)) {
          if (canCompleteQuest(quest)) {
            completable.push(quest)
          } else {
            incompletable.push(quest)
          }
        }
      }
      setCompletable(completable.sort(compareQuests))
      setIncompletable(incompletable.sort(compareQuests))
      setSpinnerActive(false)
    }
  }

  function renderAllQuests() {
    return (
      <tbody>
        {renderQuests(completable, 'completable', 'Done', e => markComplete(e, true))}
        {renderQuests(incompletable, 'incompletable', 'Done', e => markComplete(e, false))}
        {renderQuests(completed, 'completed', 'Remove', e => markIncomplete(e))}
      </tbody>
    )
  }

  function renderQuests(quests, className, buttonText, buttonCallback) {
    return quests.map((quest, i) => (
      <tr key={i} className={className}>
        <td>{quest.name}</td>
        <td>{renderPrerequisites(quest.requirements.quests)}</td>
        <td>{renderPrerequisites(quest.requirements.skills)}</td>
        <td><button className="uk-button" onClick={() => buttonCallback(quest)}>{buttonText}</button></td>
      </tr>
    ))
  }

  function markComplete(quest, wasCompletable) {
    if (!completed.find(q => q.name === quest.name)) {
      completed.push(quest)
      completed.sort(compareQuests)
      debugger
      if (wasCompletable) {
        setCompletable(completable.filter(q => q !== quest).sort(compareQuests))
      } else {
        setIncompletable(incompletable.filter(q => q !== quest).sort(compareQuests))
      }
    }
  }

  function markIncomplete(quest) {
    if (levels === null || canCompleteQuest(quest)) {
      completable.push(quest)
      completable.sort(compareQuests)
    } else {
      incompletable.push(quest)
      incompletable.sort(compareQuests)
    }
    setCompleted(completed.filter(q => q !== quest).sort(compareQuests))
  }

  function renderPrerequisites(reqs) {
    reqs = reqs || []
    return reqs.length === 0 ? null : (
      <ul className="uk-list">
        {reqs.map((req, i) => {
          if (req.includes('||')) {
            req = req.split('||').join('or')
          }
          return (<li key={i}>{req}</li>)
        })}
      </ul>
    )
  }

  function compareQuests(x, y) {
    return x.name.localeCompare(y.name)
  }

  function query() {
    encodedUsername = encodeURIComponent(username) 
    const fullUrl = CORS_ANYWHERE_URL + HISCORE_URL + encodedUsername
    setSpinnerActive(true)
    fetch(fullUrl)
      .then(res => res.text())
      .then(res => parseLevels(res))
      .catch(err => {
        console.error(err)
        setSpinnerActive(false)
      })
  }

  function parseLevels(data) {
    const split = data.split('\n')
    const levels = []
    for (let i = 1; i < 24; i++) {
      const level = parseInt(split[i].split(',')[1])
      levels.push(level)
    }
    setLevels(levels)
  }

  function readFromStorage() {
    debugger
    if (encodedUsername !== null && typeof(Storage) !== 'undefined') {
      const data = JSON.parse(localStorage.getItem(`quest_data_${encodedUsername}`))
      if (data !== null) {
        let completed = []
        for (let current of data.quests) {
          const quest = json.quests.filter(q => q.name === current)
          completed = completed.concat(quest)
        }
        setMembers(data.members)
        setCompleted(completed.sort(compareQuests))
      }
    }
  }

  function saveToStorage() {
    debugger
    if (encodedUsername !== null && typeof(Storage) !== 'undefined') {
      const data = {
        members: members,
        quests: completed.map(q => q.name)
      }
      localStorage.setItem(`quest_data_${encodedUsername}`, JSON.stringify(data))
    }
  }
}

export default App
