import React from 'react';
import { connect } from 'react-redux';

class UserList extends React.Component {
  render() {
    return (
      <div>
        {this.props.users.map((user, idx) => (
          <div key={idx}>
            <div>First Name : {user.first_name}</div>
            <div>First Name : {user.last_name}</div>
          </div>
        ))}
      </div>
    );
  }
}

const mapStateToProps = state => ({
  users: state.users.users
});

export default connect(mapStateToProps)(UserList);
