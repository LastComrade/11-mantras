import React, { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import socket from '../../socket';

const Main = (props) => {
  const roomRef = useRef();
  const userRef = useRef();
  const [err, setErr] = useState(false);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    socket.on('FE-error-user-exist', ({ error }) => {
      if (!error) {
        const roomName = roomRef.current.value;
        const userName = userRef.current.value;

        sessionStorage.setItem('user', userName);
        props.history.push(`/room/${roomName}`);
      } else {
        setErr(error);
        setErrMsg('User name already exist');
      }
    });
  }, [props.history]);

  function clickJoin() {
    const roomName = roomRef.current.value;
    const userName = userRef.current.value;

    if (!roomName || !userName) {
      setErr(true);
      setErrMsg('Enter Room Name or User Name');
    } else {
      socket.emit('BE-check-user', { roomId: roomName, userName });
    }
  }

  const deleteCookie = (cookieName, cookieValue, daysToExpire) => {
    var date = new Date();
    date.setTime(date.getTime() - daysToExpire * 24 * 60 * 60 * 1000);
    document.cookie =
      cookieName + '=' + cookieValue + '; expires=' + date.toGMTString();
  };

  const handleLogout = () => {
    // document.cookie = 'user=';
    deleteCookie('user', '', 1);
    window.location.reload();
  };

  let isAuthenticated = document.cookie == '' ? false : true;
  console.log('isAuthenticated', isAuthenticated);

  return (
    <MainContainer>
      {isAuthenticated === true ? (
        <>
          <JoinButton onClick={handleLogout}>Logout</JoinButton>
          <JoinButton><Link to="/profile">Profile</Link></JoinButton>
        </>
      ) : (
        <>
          <JoinButton>
            <Link to="/register">Register</Link>
          </JoinButton>
          <JoinButton>
            <Link to="/login">Login</Link>
          </JoinButton>
        </>
      )}
      <JoinButton>
        <Link to="/payment-records">Payment Records</Link>
      </JoinButton>
      <JoinButton>
        <Link to="/astrologers">All Astrologers</Link>
      </JoinButton>
      <Row>
        <Label htmlFor="roomName">Room Name</Label>
        <Input type="text" id="roomName" ref={roomRef} />
      </Row>
      <Row>
        <Label htmlFor="userName">User Name</Label>
        <Input type="text" id="userName" ref={userRef} />
      </Row>
      <JoinButton onClick={clickJoin}> Join </JoinButton>
      {err ? <Error>{errMsg}</Error> : null}
    </MainContainer>
  );
};

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  margin-top: 15px;
  line-height: 35px;
`;

const Label = styled.label``;

const Input = styled.input`
  width: 150px;
  height: 35px;
  margin-left: 15px;
  padding-left: 10px;
  outline: none;
  border: none;
  border-radius: 5px;
`;

const Error = styled.div`
  margin-top: 10px;
  font-size: 20px;
  color: #e85a71;
`;

const JoinButton = styled.button`
  height: 40px;
  margin-top: 35px;
  outline: none;
  border: none;
  border-radius: 15px;
  color: #d8e9ef;
  background-color: #4ea1d3;
  font-size: 25px;
  font-weight: 500;

  :hover {
    background-color: #7bb1d1;
    cursor: pointer;
  }

  a {
    text-decoration: none;
    color: #d8e9ef;
  }
`;

export default Main;
