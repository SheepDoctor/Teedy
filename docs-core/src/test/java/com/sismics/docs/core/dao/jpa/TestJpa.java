package com.sismics.docs.core.dao.jpa;

import com.sismics.docs.BaseTransactionalTest;
import com.sismics.docs.core.dao.UserDao;
import com.sismics.docs.core.dao.criteria.UserCriteria;
import com.sismics.docs.core.dao.dto.UserDto;
import com.sismics.docs.core.model.jpa.User;
import com.sismics.docs.core.util.TransactionUtil;
import com.sismics.docs.core.util.authentication.InternalAuthenticationHandler;
import com.sismics.docs.core.util.jpa.SortCriteria;
import org.junit.Assert;
import org.junit.Test;

import java.util.List;

/**
 * Tests the persistance layer.
 * 
 * @author jtremeaux
 */
public class TestJpa extends BaseTransactionalTest {
    @Test
    public void testJpa() throws Exception {
        // Create a user
        UserDao userDao = new UserDao();
        User user = createUser("testJpa");

        TransactionUtil.commit();

        // Search a user by his ID
        user = userDao.getById(user.getId());
        Assert.assertNotNull(user);
        Assert.assertEquals("toto@docs.com", user.getEmail());

        // Authenticate using the database
        Assert.assertNotNull(new InternalAuthenticationHandler().authenticate("testJpa", "12345678"));

        // Delete the created user
        userDao.delete("testJpa", user.getId());
        TransactionUtil.commit();
    }
    
    @Test
    public void testFindByCriteria() throws Exception {
        // Create users
        UserDao userDao = new UserDao();
        User user1 = createUser("testFindByCriteria1");
        User user2 = createUser("testFindByCriteria2");
        User user3 = createUser("testFindByCriteria3");
        
        TransactionUtil.commit();
        
        // Test search by username
        UserCriteria criteria = new UserCriteria();
        criteria.setUserName("testFindByCriteria1");
        List<UserDto> users = userDao.findByCriteria(criteria, null);
        Assert.assertEquals(1, users.size());
        Assert.assertEquals("testFindByCriteria1", users.get(0).getUsername());
        
        // Test search by search term
        criteria = new UserCriteria();
        criteria.setSearch("testFindByCriteria");
        users = userDao.findByCriteria(criteria, null);
        Assert.assertEquals(3, users.size());
        
        // Test search with sort criteria
        SortCriteria sortCriteria = new SortCriteria(1, false); // Sort by username descending
        users = userDao.findByCriteria(criteria, sortCriteria);
        Assert.assertEquals(3, users.size());
        Assert.assertEquals("testFindByCriteria3", users.get(0).getUsername());
        
        // Test search by user ID
        criteria = new UserCriteria();
        criteria.setUserId(user2.getId());
        users = userDao.findByCriteria(criteria, null);
        Assert.assertEquals(1, users.size());
        Assert.assertEquals("testFindByCriteria2", users.get(0).getUsername());
        
        // Clean up
        userDao.delete("testFindByCriteria1", user1.getId());
        userDao.delete("testFindByCriteria2", user2.getId());
        userDao.delete("testFindByCriteria3", user3.getId());
        TransactionUtil.commit();
    }
}
