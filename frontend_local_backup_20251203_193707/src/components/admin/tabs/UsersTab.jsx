import React, { useState } from 'react';

const UsersTab = ({
  users,
  newUser,
  setNewUser,
  editingUser,
  setEditingUser,
  addUser,
  updateUser,
  deleteUser,
  startEditUser,
  cancelEditUser
}) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
      <div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              👥 Lista użytkowników
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            {users && users.length === 0 ? (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                color: '#6c757d',
                fontStyle: 'italic'
              }}>
                Brak użytkowników w systemie
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {users && users.map(user => (
                  <div
                    key={user.id}
                    style={{
                      padding: '1rem',
                      border: '1px solid #e9ecef',
                      borderRadius: '0.375rem',
                      backgroundColor: '#fff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        {editingUser && editingUser.id === user.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <input
                              type="text"
                              value={editingUser?.login || ''}
                              onChange={(e) => setEditingUser({
                                ...editingUser,
                                login: e.target.value
                              })}
                              style={{
                                padding: '0.375rem',
                                border: '1px solid #ced4da',
                                borderRadius: '0.25rem',
                                fontSize: '0.875rem'
                              }}
                              placeholder="Login użytkownika"
                            />
                            <input
                              type="password"
                              value={editingUser?.haslo || ''}
                              onChange={(e) => setEditingUser({
                                ...editingUser,
                                haslo: e.target.value
                              })}
                              style={{
                                padding: '0.375rem',
                                border: '1px solid #ced4da',
                                borderRadius: '0.25rem',
                                fontSize: '0.875rem'
                              }}
                              placeholder="Hasło"
                            />
                            <select
                              value={editingUser?.typ || 'kasjer'}
                              onChange={(e) => setEditingUser({
                                ...editingUser,
                                typ: e.target.value
                              })}
                              style={{
                                padding: '0.375rem',
                                border: '1px solid #ced4da',
                                borderRadius: '0.25rem',
                                fontSize: '0.875rem'
                              }}
                            >
                              <option value="kasjer">Kasjer</option>
                              <option value="admin">Admin</option>
                              <option value="kierownik">Kierownik</option>
                            </select>
                          </div>
                        ) : (
                          <div>
                            <div style={{ 
                              fontWeight: '600', 
                              fontSize: '0.875rem',
                              color: '#495057'
                            }}>
                              {user.login}
                              <span style={{
                                marginLeft: '0.5rem',
                                fontSize: '0.75rem',
                                padding: '0.125rem 0.375rem',
                                borderRadius: '0.25rem',
                                backgroundColor: user.typ === 'admin' ? '#dc3545' : user.typ === 'kierownik' ? '#ffc107' : '#28a745',
                                color: user.typ === 'kierownik' ? '#000' : '#fff'
                              }}>
                                {user.typ}
                              </span>
                            </div>
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: '#6c757d',
                              marginTop: '0.25rem'
                            }}>
                              ID: {user.id}
                            </div>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
                        {editingUser && editingUser.id === user.id ? (
                          <>
                            <button
                              onClick={updateUser}
                              style={{
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.75rem',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer'
                              }}
                            >
                              Zapisz
                            </button>
                            <button
                              onClick={cancelEditUser}
                              style={{
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.75rem',
                                backgroundColor: '#6c757d',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer'
                              }}
                            >
                              Anuluj
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditUser(user)}
                              style={{
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.75rem',
                                backgroundColor: '#007bff',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer'
                              }}
                            >
                              Edytuj
                            </button>
                            <button
                              onClick={() => deleteUser(user.id)}
                              style={{
                                padding: '0.375rem 0.75rem',
                                fontSize: '0.75rem',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '0.25rem',
                                cursor: 'pointer'
                              }}
                            >
                              Usuń
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div>
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '1rem'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              ➕ Dodaj użytkownika
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                  Login
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none'
                  }}
                  placeholder="Login użytkownika"
                  value={newUser?.login || ''}
                  onChange={(e) => setNewUser({
                    ...newUser,
                    login: e.target.value
                  })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                  Hasło
                </label>
                <input
                  type="password"
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none'
                  }}
                  placeholder="Hasło"
                  value={newUser?.haslo || ''}
                  onChange={(e) => setNewUser({
                    ...newUser,
                    haslo: e.target.value
                  })}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                  Typ użytkownika
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '0.375rem 0.75rem',
                    fontSize: '0.875rem',
                    border: '1px solid #ced4da',
                    borderRadius: '0.375rem',
                    outline: 'none'
                  }}
                  value={newUser?.typ || 'kasjer'}
                  onChange={(e) => setNewUser({
                    ...newUser,
                    typ: e.target.value
                  })}
                >
                  <option value="kasjer">Kasjer</option>
                  <option value="admin">Admin</option>
                  <option value="kierownik">Kierownik</option>
                </select>
              </div>
              <button
                onClick={addUser}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Dodaj użytkownika
              </button>
            </div>
          </div>
        </div>

        {/* Statystyki */}
        <div style={{
          backgroundColor: '#007bff',
          color: 'white',
          borderRadius: '0.375rem',
          padding: '1rem',
          textAlign: 'center',
          marginBottom: '1rem'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
            👥 {users?.length || 0}
          </div>
          <div>Łączna liczba użytkowników</div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #e9ecef',
          borderRadius: '0.375rem',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            padding: '0.75rem 1rem',
            borderBottom: '1px solid #e9ecef',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ margin: 0, fontWeight: '600', color: '#495057' }}>
              💡 Informacje
            </h6>
          </div>
          <div style={{ padding: '1rem' }}>
            <p style={{ color: '#6c757d', lineHeight: '1.5', margin: '0', fontSize: '0.875rem' }}>
              Zarządzaj użytkownikami systemu. Możesz dodawać nowych użytkowników, 
              edytować istniejących oraz nadawać im odpowiednie uprawnienia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersTab;
